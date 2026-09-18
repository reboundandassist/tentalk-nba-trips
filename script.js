const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector("#mobile-menu");
const navLinks = [...document.querySelectorAll('.desktop-nav a, .mobile-menu a:not(.mobile-menu-cta)')];

const setMenuState = (open) => {
  menuButton.setAttribute("aria-expanded", String(open));
  mobileMenu.hidden = !open;
  document.body.classList.toggle("menu-open", open);
  menuButton.querySelector(".sr-only").textContent = open ? "關閉選單" : "開啟選單";
};

menuButton.addEventListener("click", () => {
  setMenuState(menuButton.getAttribute("aria-expanded") !== "true");
});

mobileMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuState(false));
});

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}, { passive: true });

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle("is-active", link.hash === `#${entry.target.id}`));
  });
}, { rootMargin: "-30% 0px -60%", threshold: 0 });

document.querySelectorAll("#map, #all-stars, #journey, #tips, #about").forEach((section) => sectionObserver.observe(section));

const scoreboard = document.querySelector(".hero-scoreboard");
const scoreDigits = [...document.querySelectorAll("[data-score-target]")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const showFinalScore = () => {
  scoreDigits.forEach((digit) => {
    digit.textContent = digit.dataset.scoreTarget;
  });
  scoreboard.classList.add("scoreboard-ready");
};

if (reduceMotion) {
  showFinalScore();
} else {
  window.setTimeout(() => {
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      scoreDigits.forEach((digit) => {
        const target = Number(digit.dataset.scoreTarget);
        const nextValue = Math.min(step, target);
        if (digit.textContent === String(nextValue)) return;
        digit.textContent = String(nextValue);
        digit.classList.remove("is-flipping");
        void digit.offsetWidth;
        digit.classList.add("is-flipping");
      });

      if (step >= 9) {
        window.clearInterval(timer);
        scoreboard.classList.add("scoreboard-ready");
      }
    }, 95);
  }, 100);
}

const arenaDetails = {
  MIA: {
    city: "邁阿密",
    english: "Miami",
    sections: [
      { label: "酒店", body: "EAST Hotel —— A++" },
      { label: "城市氛圍", body: "美國其中一個最出色的城市，氣氛極佳。" },
      { label: "活動", body: "邁阿密海灘、購物區、小哈瓦那（Little Havana）" },
      { label: "飲食", body: "整體水平很高。" },
      { label: "備註", body: "單是海灘、美食與市區探索，已足夠充實一整天。" },
    ],
  },
  ATL: {
    city: "亞特蘭大",
    english: "Atlanta",
    sections: [
      { label: "酒店", body: "AC Hotel Atlanta Downtown —— 步行即可到達球館。" },
      { label: "城市氛圍", body: "城市規模適中，活動豐富，現代化程度不錯。" },
      { label: "活動", items: ["可口可樂博物館：約 90 分鐘的參觀體驗良好。", "館內設有免費甜品自動售賣機，頗有趣味。", "附近有世界最大水族館之一 Georgia Aquarium，下次可再訪。"] },
      { label: "飲食", body: "Gus’ World Famous Fried Chicken —— 水平穩妥，但未達令人難忘的程度。" },
      { label: "球館感受", body: "球館非常現代化，彷彿走進全新商場，空間感與整體氛圍令人驚喜。" },
    ],
  },
  PHX: {
    city: "鳳凰城",
    english: "Phoenix",
    sections: [
      { label: "酒店", body: "Sonder at McKinley（兩晚）—— 步行約 30 分鐘，公寓式房間寬敞。" },
      { label: "活動", items: ["沙漠植物園（Desert Botanic Garden）及 Hole in the Rock 步行，帶來沉浸式沙漠體驗。", "仙人掌植物園出乎意料地精彩，約兩至三小時足夠。"] },
      { label: "其他", items: ["球館外的 Team Store 值得一訪，非比賽日亦會開放。", "前 NBA 球員 Dan Majerle 的餐廳就在對面。", "店舖職員聽過我們的旅程後，特意送上餐廳特別版 T 恤作為紀念。"] },
    ],
  },
  SAC: {
    city: "沙加緬度",
    english: "Sacramento",
    sections: [
      { label: "酒店", body: "Quality Inn Sacramento Convention Center —— 步行約 20 至 30 分鐘，房間偏小；其他酒店價格過高。" },
      { label: "城市氛圍", body: "除了籃球對抗之外，城市活動相對較少。" },
      { label: "備註", body: "此行觀看對陣金州勇士的第五場比賽。在壽司店與廚師閒談時，他提及自己從金州搬到沙加緬度後，球迷文化的轉變。當地球迷當時情緒緊張，因為城市已多年未能打入季後賽；期間亦訪問了不少真正焦慮的球迷。結果該輪系列賽落敗，而沙加緬度其後亦長期未能重返季後賽。" },
    ],
  },
  LAL: {
    city: "洛杉磯",
    english: "Los Angeles · Lakers",
    sections: [
      { label: "酒店", body: "E Central Hotel Downtown Los Angeles（兩晚）—— 步行約 5 分鐘即可到達 Crypto.com Arena，對 NBA 球迷而言性價比極高。" },
      { label: "城市氛圍", body: "逗留數天可前往多個著名景點，並品嚐各地美食。" },
      { label: "球館／商店", body: "最令人失望的是 Team Store 規模遠低於預期，顯得過於狹小。非比賽日需同時販售湖人、快艇（當時仍共用球館）及國王隊商品；比賽日才轉換為單一球隊商品，管理上相當困難。優點是球館外設有多座雕像。當時高比拜仁雕像尚未豎立，期望有機會再訪時能親眼目睹，並順道到快艇新球館觀戰。" },
    ],
  },
  CLE: {
    city: "克里夫蘭",
    english: "Cleveland",
    sections: [
      { label: "酒店", body: "Hotel Indigo Cleveland Downtown —— 步行約 5 分鐘，整潔舒適，水平足夠。" },
      { label: "城市氛圍", body: "屬於較為安靜的城市。抵達時已是深夜，Uber 司機來自舊金山，大半職業生涯在當地度過，令人好奇他為何選擇移居如此寧靜的地方。比賽當天為星期日，市中心更顯冷清。超市選擇有限，但仍購得乳酪、康普茶及水果。" },
      { label: "球館感受", body: "球館極為現代化，氣氛熱烈且設計出色。Team Store 於比賽開始前兩小時以上已開放，共有兩層，值得預留時間參觀。這是至今唯一一次現場觀看第七場比賽。克里夫蘭一度落後約 17 分，其後成功逆轉；Donovan Mitchell 表現出色，全場氣氛瘋狂。座位較為接近球場，下半場甚至參與向奧蘭多魔術球員罰球時的揮手干擾。整場比賽令人難忘。" },
    ],
  },
  MIN: {
    city: "明尼蘇達",
    english: "Minnesota",
    sections: [
      { label: "酒店", body: "Hilton Minneapolis Downtown —— 步行約 15 分鐘，早餐基本，房間質素穩妥。" },
      { label: "行程備註", body: "此行與父母同行。" },
      { label: "活動", items: ["早上前往密西西比河畔觀景；原計劃步行過河的行人橋當時關閉。", "Juicy Lucy 漢堡極為出色，肉餅厚實且內含大量肉汁，到訪此球館絕對值得一試。"] },
      { label: "球館感受", body: "球館屬翻新而非全新，但翻新效果良好。這是至今唯一一場幾乎在最後一球定勝負的比賽，主隊成功完成雙位數逆轉。觀眾以成年人為主，氣氛成熟穩重，與邁阿密較為休閒的觀眾群明顯不同。" },
    ],
  },
  ORL: {
    city: "奧蘭多",
    english: "Orlando",
    sections: [
      { label: "酒店", body: "Embassy Suites by Hilton Orlando Downtown —— 略顯陳舊，但步行約 15 分鐘，已足夠應付需要。" },
      { label: "城市氛圍", body: "球館附近區域相當可愛，可見迪士尼風格的影響，小型柱子與橋樑設計帶有度假村感覺。" },
      { label: "球館感受", body: "球館水平穩妥，設有介紹球隊歷史與球員的角落。比賽從一開始即呈一面倒之勢，奧蘭多大幅領先夏洛特黃蜂。由於不少觀眾提早離場，第四節與 Kyle 一同走到接近球員席的位置，近距離接觸 Paolo Banchero 與 Franz Wagner，並拍攝多張自拍。比賽接近尾聲時，我們更成功出現在 Jumbotron 上；事後從照片中才發現，頗為有趣。" },
    ],
  },
  DEN: {
    city: "丹佛",
    english: "Denver",
    sections: [
      { label: "酒店", body: "SpringHill Suites by Marriott Denver Downtown —— 整潔舒適，早餐基本，步行僅約 10 分鐘。" },
      { label: "城市氛圍", body: "從奧蘭多飛抵後，意外感到寒冷，氣溫約為 4°C。飛機上可見群山，落地後路面仍有未融積雪；「一哩高城」名不虛傳。" },
      { label: "活動", items: ["到訪休閒運動酒吧，已有不少球迷穿著 Anthony、Jokić 及 Cameron Johnson 球衣。", "差點誤闖戶外觀賽區。"] },
      { label: "球館／商店", body: "Team Store 水準不錯，明顯優於奧蘭多，商品種類豐富，球衣與禮品質素佳。" },
      { label: "比賽感受", body: "首次穿上作客球衣——Anthony Edwards 的森林狼球衣——觀賽。上半場競爭激烈，但森林狼在下半場約四至五分鐘內失去節奏，其後未能追回。現場觀看 Jokić 依然是極佳體驗。" },
      { label: "其他", body: "因連日旅途疲憊，晚餐於酒店解決。與好友 Kyle 共度的 36 小時特別難得。他其後繼續前往聖安東尼奧觀看 Wembanyama 的季後賽處子戰，令人羨慕；自己則在洛杉磯稍作停留後返回香港。" },
    ],
  },
};

const detail = {
  panel: document.querySelector(".map-detail"),
  code: document.querySelector("[data-detail-code]"),
  year: document.querySelector("[data-detail-year]"),
  city: document.querySelector("[data-detail-city]"),
  cityEn: document.querySelector("[data-detail-city-en]"),
  content: document.querySelector("[data-detail-content]"),
};

const renderArenaDetail = (pin) => {
  const arena = arenaDetails[pin.dataset.code];
  detail.code.textContent = pin.dataset.code;
  detail.year.textContent = pin.dataset.year;
  detail.city.textContent = arena.city;
  detail.cityEn.textContent = arena.english;

  const blocks = arena.sections.map((section) => {
    const block = document.createElement("section");
    block.className = "detail-block";

    const heading = document.createElement("h4");
    heading.textContent = section.label;
    block.append(heading);

    if (section.items) {
      const list = document.createElement("ul");
      section.items.forEach((item) => {
        const listItem = document.createElement("li");
        listItem.textContent = item;
        list.append(listItem);
      });
      block.append(list);
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = section.body;
      block.append(paragraph);
    }

    return block;
  });

  detail.content.replaceChildren(...blocks);
  detail.panel.scrollTop = 0;
};

const selectPin = (pin) => {
  document.querySelectorAll(".map-pin").forEach((item) => item.classList.remove("is-active"));
  pin.classList.add("is-active");
  renderArenaDetail(pin);
};

document.querySelectorAll(".map-pin").forEach((pin) => {
  pin.addEventListener("click", () => selectPin(pin));
});

renderArenaDetail(document.querySelector(".map-pin.is-active"));

document.querySelector(".copyright [data-year]").textContent = new Date().getFullYear();
