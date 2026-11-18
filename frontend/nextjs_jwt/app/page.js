
"use client";

/*
 * 이 파일은 홈페이지("/")의 화면을 만드는 페이지 컴포넌트입니다.
 * 서버에서 메뉴 목록을 받아 무작위로 최대 3개 골라 추천 카드로 보여 줍니다.
 * useState/useEffect를 사용하므로 브라우저에서 실행되는 클라이언트 컴포넌트입니다.
 */
import Image from "next/image";
import appImage from "./img/app.jpg";
// React가 제공하는 상태(state)와 화면 표시 후 작업(effect) 기능을 가져옵니다.
import { useEffect, useState } from "react";
// 메뉴 데이터를 가져오는 프로젝트 내부 API 함수입니다. "@/..."는 프로젝트 경로 별칭입니다.
import { getAllMenus } from "@/services/api";
// 메뉴 한 건의 표시를 담당하는 재사용 컴포넌트입니다.
import MenuCard from "@/components/MenuCard";

// export는 이 함수를 다른 파일이나 Next.js가 사용할 수 있도록 내보냅니다.
// default는 이 파일의 대표 내보내기라는 뜻입니다. 가져올 때 중괄호 없이 원하는 이름으로 import할 수 있습니다.
// Home은 홈페이지 화면을 반환하는 React 컴포넌트 함수의 이름입니다.
export default function Home() {
  // useState(초기값)는 상태값과 그 값을 바꾸는 함수를 한 쌍으로 만듭니다.
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  // 두 번째 인수 []는 첫 화면이 나타난 뒤 이 작업을 한 번 실행하라는 의미입니다.
  useEffect(() => {
    async function loadMenus() {
      try {
        const data = await getAllMenus();
        // [...data]는 배열을 얕은 복사합니다. 새 배열이므로 sort가 원본 data의 순서를 바꾸지 않습니다.
        // 단, 배열 안의 메뉴 객체까지 복제하는 것은 아닙니다. sort로 섞은 뒤 slice(0, 3)으로 앞의 최대 3개를 선택합니다.
        const selected = [...data].sort(() => Math.random() - 0.5).slice(0, 3);

        // 상태를 갱신하면 React가 화면을 다시 그립니다.
        setMenus(selected);
      } catch (error) {
        // 요청에 실패하면 오류 내용을 사용자에게 알립니다.
        alert(error.message);
      } finally {
        // 성공 여부와 관계없이 로딩 표시를 끝냅니다.
        setLoading(false);
      }
    }

    loadMenus();
  }, []);

  // 로딩 중에는 추천 목록 대신 안내 문구를 먼저 반환합니다.
  if (loading) return <p>메뉴를 불러오는 중입니다.</p>;

  return (
    <section>
      <h2>오늘의 추천 메뉴</h2>
      {/*
      <Image
        src={appImage}
        alt="오늘의 추천 메뉴"
        width={400}
        height={300}
      />
      <img src="/img/app.JPG" alt="오늘의 추천 메뉴" />*/}
      <div className="recommend-list">
        {menus.map((menu) => (
          // map은 배열의 각 메뉴를 화면 요소로 변환합니다.
          // key는 목록이 바뀔 때 React가 각 항목을 구분하는 데 사용하는 고유값입니다.
          // <div className="card" key={menu.id}>  //key 입력 React가 화면을 업데이트할 때 어떤 항목이 추가되고, 삭제되고, 변경되었는지 효율적으로 파악
          //   <h3>{menu.name}</h3>
          //   <p>칼로리: {menu.calories} kcal</p>
          //   <p>{menu.description}</p>
          // </div>
          <MenuCard key={menu.id} menu={menu} />
        ))}

      </div>
    </section>
  );
}
