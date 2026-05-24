import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAppSelector, useAppDispatch } from "../store/Hooks";

const ProtectedRoute = ({ children, allowedRoles }) => {
    const location = useLocation();
    const user = useAppSelector((state) => state.auth?.user);

    // 1️⃣ لو مش عامل تسجيل دخول → رجّعه login ومعاه منين جه
    if (!user) {
        return <Navigate to="/log_in" state={{ from: location }} replace />;
    }

    // 2️⃣ لو محدد أدوار و المستخدم مش واحد منهم → رجّعه للصفحة الرئيسية
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = String(user.role).toLowerCase();
        const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

        if (!normalizedAllowed.includes(userRole)) {
            return <Navigate to="/" replace />;
        }
    }

    // 3️⃣ لو كل شيء تمام → اعرض الصفحة المطلوبة
    return <>{children}</>;
};

export default ProtectedRoute;
