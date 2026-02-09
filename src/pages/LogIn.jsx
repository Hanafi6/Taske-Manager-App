import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchUsers } from "../slices/usersSlice";
import { loginUser } from "../slices/AuthSlice";
import { LogIn } from 'lucide-react'

function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { list } = useSelector((state) => state.users);
    const { user, authLoading } = useSelector((state) => state.auth);

    // form: identifier = email OR name
    const [formData, setFormData] = useState({ identifier: "", password: "" });
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");

    // useEffect(() => {
    //     dispatch(fetchUsers());
    // }, [dispatch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.identifier || !formData.password) {
            setError("من فضلك أدخل الإيميل / الاسم وكلمة المرور");
            return;
        }


        dispatch(loginUser(formData))
            .unwrap()
            .then((res) => {
                navigate("/");
            })
            .catch((err) => {
                console.log("❌ error:", err);
                setError(err);
            });

    };

    useEffect(() => {
        // console.log(authLoading)
    }, [authLoading])

    return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <form
                onSubmit={handleSubmit}
                className="bg-white shadow-lg rounded-2xl p-8 w-96 space-y-5"
            >
                <h2 className="text-2xl font-semibold text-center text-blue-600">
                    LogIn
                </h2>
                {/* 
                {error && (
                    <p className="text-red-500 bg-red-50 border border-red-200 rounded p-2 text-sm">
                        {error}
                    </p>
                )} */}

                {info && (
                    <p className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
                        {info}
                    </p>
                )}

                <input
                    type="text"
                    placeholder="Name or Email"
                    value={formData.identifier}
                    onChange={(e) =>
                        setFormData({ ...formData, identifier: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />

                <button
                    type="submit"
                    className="w-full flex justify-evenly items-center bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition"
                >
                    {!authLoading ? <> LogIn <LogIn /></> : <div>...loged In</div>}
                </button>

                <p className="text-sm text-gray-500 text-center">
                    Don't have an account?{" "}
                    <a href="/register" className="text-blue-600 font-semibold">
                        Register
                    </a>
                </p>
            </form>
        </div>
    );
}

export default Login;
