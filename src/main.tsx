import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { store } from "./store/Store";
import { Provider } from "react-redux";
import NavBar from "./components/NavBar";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <BrowserRouter>
      {/* الحاوية الأساسية للتطبيق بالكامل */}
      <div className=" flex flex-col antialiased">

        {/* 1. النبار فوق وثابت */}
        <NavBar />

        {/* 2. منطقة المحتوى السفلي (شاملة السايدبار والصفحات) */}
        <div className="flex flex-1 relative w-full">

          {/* المحتوى الرئيسي للتطبيق (الـ Routes والصفحات) */}
          {/* عملنا pr-24 (Padding Right) علشان نسيب مساحة ثابتة للسايدبار المقفول على اليمين والمحتوى ميتداراش وراه */}
          <main className="flex-1 p-6 pr-24 transition-all duration-300">
            <App />
          </main>

          {/* السايدبار العايم على اليمين */}
          {/* <Sidebar /> */}


        </div>
      </div>
    </BrowserRouter>
  </Provider>
);