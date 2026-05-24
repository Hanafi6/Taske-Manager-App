import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../store/Hooks";

import '../style/navBar.css'


function NavBar() {
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const [drob, setDrob] = useState(false);
    const navigate = useNavigate();

    const selectManeu = [
        { name: "Create Project", path: "/create-project" },
        { name: "Create Taske", path: "/add-taske-to-project" },

    ]



    const { user } = useAppSelector((state) => state.auth);


    // if (!user) navigate('/log_in')


    const links = user ? [
        { name: "Home", path: "/" },
        { name: "Dashboard", path: "/dashboard" },
        { name: "Users", path: "/users" },
        { name: "Projects", path: "/projects" },
        { name: "Tasks", path: "/tasks" },
        { name: "Notifications", path: "/notifications" },
    ] : [
        { name: "Log In", path: "/log_in" },
        { name: "Regester", path: "/regester" },
    ];



    const Drob = ({ drob }) => {
        const [f] = useState(`left-${Math.floor(Math.random() * 10)}`);
        const [InOpen, setIsOpen] = useState(false);
        useEffect(() => {
            setIsOpen(true)
        }, [drob])
        return (
            <motion.div
                initial={{ scale: 0, opacity: 0, y: 0 }}
                animate={{ scale: 1, opacity: 1, y: '20px' }}
                exit={{ scale: 0, opacity: 0, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 10 }}
                className={`w-fit p-[5px] rounded top-9 ${f} bg-[#0820fc] fixed`}
            >
                <AnimatePresence mode="sync">
                    {InOpen && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 15 }}
                        >
                            <ul>
                                {selectManeu.map((item) => {

                                    return (
                                        <li onClick={e => {
                                            setDrob(false);
                                            setIsOpen(false)
                                            navigate(item.path);
                                        }
                                        } key={item.path} className=" cursor-pointer hover:text-red-500 duration-200 text-white font-bold">{item.name}</li>
                                    )
                                })}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        )
    }

    return (
        <nav className="bg-[#38159f] shadow fixed top-0 left-0 w-full max-h-20 z-50">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                {/* Logo */}
                <h1 id="logo" className="text-2xl font-bold text-blue-600 tracking-tight">
                    Taske<span className="">Manger</span>
                </h1>

                {/* Desktop Links */}

                <div className="hidden md:flex space-x-6 items-center">

                    <AnimatePresence>
                        {user?.role === 'admin' && <>{pathname !== '/create-project' && pathname !== '/add-taske-to-project' && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0, x: -50 }}
                                animate={{ scale: 1, opacity: 1, x: 0 }}
                                exit={{ scale: 0, opacity: 0, x: -50 }}
                                transition={{ type: "spring", stiffness: 260, damping: 15 }}
                                onClick={e => setDrob(prev => !prev)}
                                className={`font-medium select-none transition-colors cursor-pointer ${drob
                                    ? "text-blue-600"
                                    : "text-[#fff] hover:text-blue-600"
                                    }`}
                            >start</motion.div>
                        )}</>}
                    </AnimatePresence>

                    <AnimatePresence>

                        {drob && (
                            <Drob drob={drob} />
                        )}
                    </AnimatePresence>
                    {links.map((link) => {
                        return (
                            <div key={link.path} className="relative">
                                <Link
                                    to={link.path}
                                    className={`font-medium transition-colors ${pathname === link.path
                                        ? "text-blue-600"
                                        : "text-[#fff] hover:text-blue-600"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                                {pathname === link.path && (
                                    <motion.div
                                        layoutId="underline"
                                        className="absolute left-0 right-0 -bottom-1 h-[2px] bg-blue-600 rounded-full"
                                    />
                                )}

                            </div>
                        )
                    })}

                </div>


                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-gray-700"
                    onClick={() => setOpen(!open)}
                >
                    {open ? <X size={26} /> : <Menu size={26} />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden bg-white border-t shadow-sm"
                    >
                        {links.map((link) => {
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setOpen(false)}
                                    className={`block px-6 py-3 text-base border-b ${pathname === link.path
                                        ? "text-blue-600 font-semibold"
                                        : "text-gray-700 hover:text-blue-600"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}

export default NavBar;
