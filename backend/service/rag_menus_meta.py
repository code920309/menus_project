from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
import json, os
from langchain_core.documents import Document
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_chroma import Chroma  
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser # llm응답시 문자열로 해라 객체

load_dotenv()  # .env 에 있는 구글 api 키를 자동으로 로딩

PATH_JSON = "./storage/menus_recommendation.json"
PATH_CHROMA = "./chroma_db/menus_db_meta"

# 모델을 선정하고 파라미터 값을 설정할 수 있다.
llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", #문장을 잘 만들어 주는 뇌..문장을 잘 분석하는 뇌.. 언어를 잘 이해
                             temperature=0.3,  # 0.0 일관성 높은 답변, 0.3 0.0보다는 창의성이 추가-일반적인답변
                                              #1.0 기본값- 창의적인 답변..  1.5는 정말 창의적인 답변
                                             # 창의적인 것을 llm 단어를 보고 의도를 보고 그때 그때 답변이 달라질 수있다.
                             max_output_tokens=1024 #대답에 대한 토큰 수 설정. 토큰을 판단하는 기준.
                             )

#jhgan/ko-sroberta-multitask 이 임베딩 모델을 다운로드 받는 과정..
embeddings = HuggingFaceEmbeddings(
    model_name="jhgan/ko-sroberta-multitask",
    model_kwargs={"device": "cpu"},  # GPU 있으면 "cuda"
    encode_kwargs={"normalize_embeddings": True} # 벡터 비교에서 중요한 건 “방향”임
)

# json파일을 로드하여 Document생성(meta 포함) 데이터 베이스 만들기
def make_vectordb_with_meta():
    with open(PATH_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Document생성
    docs=[] # document 문서를 저장할 배열
    for row in data:
        content=f"""
        이름:{row['name']} 
        설명:{row['description']}
        """
        docmake = Document(
            page_content=content.strip(),
            metadata={
                "name":row['name'],
                "calories":int(row['calories']),
                "recommendation":int(row['recommendation'])
            }
        )
        docs.append(docmake)

    #벡터 데이터 베이스 생성
    Chroma.from_documents(
        documents=docs,    # 벡터 데이터 베이스를 구축할 정보
        embedding=embeddings,  # docs의 문장을 해석하여 데이터베이스를 구축할 임베딩 객체
        persist_directory=PATH_CHROMA  # 데이터베이스 위치
    )

def loadVector():
    #만약 데이터베이스가 없다면 생성하시오 추가
    #PATH_CHROMA 위치의 폴더가 없다면 디비가 없다고 간주
    if not os.path.exists(PATH_CHROMA):
        print("DB가 없어요 생성하고 갈께요")
        make_vectordb_with_meta()

    print('DB를 로드합니다')
    vectorstore = Chroma(
        persist_directory=PATH_CHROMA,
        embedding_function=embeddings  # 주의할 점.. 벡터디비구축시 embedding 모델과
                                    # 읽어 올 때의 모델은 동일해야 합니다. 
    )
    return vectorstore

def analyze_query(user_query):
    analyze_prompt = ChatPromptTemplate.from_template("""
    사용자의 질문을 분석하여 아래 json형식으로 결과를 출력해 줘(다른 설명은 절대 붙이지 말 것)
    - query : 벡터검색을 이한 핵심 키워드 또는 메뉴이름 (예:"매운 요리", "마라탕")
    - max_calories : 지문에 언급된 최대 칼로리 조건(숫자만 추출, 없으면 null)
    - min_recommendation : 질문에 언급된 최소 추천수 조건 (숫자만 추출, 없으면 null)

    [사용자 질문]:{query}
    [출력형식(json)]:
    {{"query":"추출된 검색어","max_calories":null, "min_recommendation":null}}
    """)

    chain = analyze_prompt | llm | StrOutputParser()
    result_str = chain.invoke({"query":user_query})  #StrOutputParser result_str 문자열

    try:
        return json.loads(result_str) ## result_str값을 json으로 변경할때 예외가 발생하면
    except Exception as e:
        return {"query":user_query,"max_calories":None, "min_recommendation":None}

## 메타데이터를 사용해서 유사도 검색.. -RAG에서 R단계
def retrival_docs(query, max_calories=None, min_recommendation=None, k=3):
    filter_conditions={} 
    if max_calories is not None:
        filter_conditions['calories'] = {"$lte" : int(max_calories)}
        #                  키정의      = 값.. $lte(less than or equal)  이하..   
        #                                    $lt 미만, 
        #                                    $gte(greater than or equal)  이상,   $gt   초과
    if min_recommendation is not None:
        filter_conditions['recommedation'] = {"gte" : int(min_recommendation)}

    #유사도검색시 전달한 메타데이터   filter_conditions 있다면 filter_conditions리턴, 아니면 None
    search_filter = filter_conditions if filter_conditions else None 
    print(query, search_filter)

    # 이제 유사도 검색 실시
    results = loadVector().similarity_search(query, k=k, filter=search_filter)

   # print(results)
    return results

## RAG에서 A 단계
def format_docs_with_metadata(docs):
    if not docs:
        return "문서가 없다. 검색된 문서가 없다"

    formatted_list= []

    for doc in docs:
        meta =doc.metadata
        info = f"""
        [메뉴정보]
        - 칼로리:{meta['calories']}
        - 이름:{meta['name']}
        - 추천수:{meta['recommendation']}
        [문서내용]
        {doc.page_content}
        """
        formatted_list.append(info)

    return "\n\n".join(formatted_list)

# G
# RAG 최종본
def rag_process(query):
    #1번째 단계는 질의 분석 응답은 json형태
    results_ana = analyze_query(query)
    query = results_ana['query']
    max_cal =results_ana['max_calories']
    min_rec = results_ana['min_recommendation']

    #R  - 유사도 검색을 함.. 이때 메타데이터도 포함
    rdocs = retrival_docs(query, max_cal, min_rec)  
    
    #A  - [메뉴정보] [문서내용] 으로 문자열 타입으로 증강
    context = format_docs_with_metadata(rdocs)

    #프롬프트
    prompt = ChatPromptTemplate.from_template("""
    너는 음식 추천 전문가야. 아래의 참고 정보(메터데이터기반)를 바탕으로 사용자 질문에 알맞은 메뉴를 1.2. 형식으로 대답해 줘
    [사용자질문]{query}
    [참고정보 (메타데이터기반)]{context}

    [규칙]
    - 제공한 참고 정보의 메타데이터(칼로리, 추천수 등)을 답변에 활용
    - 음식 이름 먼저이야기 하기
    - 2줄 정도로 간략하게 매려적으로
    - 친절하게 구매하도록 유도
""")

    chain = prompt | llm | StrOutputParser()
    result = chain.invoke({'query':query, 'context':context})
    return result
