import React from 'react';
import {
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    LogOut
} from 'lucide-react';

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    danger?: boolean;
    onClick?: () => void;
}

const SidebarItem = ({ icon, label, active, danger, onClick }: SidebarItemProps) => {
    return (
        <button
            onClick={onClick}
            className={`
        w-full flex flex-row-reverse items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group/item relative
        ${active
                    ? 'bg-neutral-800 text-red-500 shadow-md shadow-black/40'
                    : danger
                        ? 'text-neutral-400 hover:bg-red-950/30 hover:text-red-400'
                        : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-white'
                }
      `}
        >
            {/* الأيقونة - متمركزة جهة اليمين */}
            <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover/item:scale-110'}`}>
                {icon}
            </div>

            {/* النص - يظهر جهة اليسار عند الهوفر بالكامل */}
            <span className="font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 delay-100 text-sm flex-1 text-right">
                {label}
            </span>

            {/* خط مؤشر صغير يظهر على الحافة اليمنى للعنصر النشط */}
            {active && (
                <div className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-red-500 rounded-l-full" />
            )}
        </button>
    );
};

export default function FloatingRightSidebar() {
    const [activeTab, setActiveTab] = React.useState('dashboard');

    return (
        // حاوية للتثبيت في أقصى اليمين مع إضافة padding لعزله عن الحواف (تأثير العوم)
        <div className="fixed h-[calc(100vh-12rem)] top-[70px]  bg-red-400 inset-y-0 right-0 z-50 flex items-center p-4">
            {/* السايدبار العايم */}
            <aside
                className="
          h-full bg-neutral-950/95 backdrop-blur-md border border-neutral-900 text-white p-3
          flex flex-col justify-between items-end rounded-2xl
          w-20 hover:w-64
          transition-all duration-300 ease-in-out
          group shadow-[0_0_30px_rgba(0,0,0,0.8)]
        "
            >
                {/* الجزء العلوي: اللوجو والقائمة */}
                <div className="w-full space-y-8">

                    {/* اللوجو (معكوس ليتناسب مع اليمين) */}
                    <div className="flex flex-row-reverse items-center gap-3 px-3 py-2 h-12 overflow-hidden">
                        <span className="text-3xl font-black tracking-tighter text-red-600 select-none min-w-[32px] text-center">
                            N
                        </span>
                        <span className="text-xl font-bold tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-right flex-1">
                            FLIX
                        </span>
                    </div>

                    {/* عناصر التنقل */}
                    <nav className="space-y-1 w-full">
                        <SidebarItem
                            icon={<LayoutDashboard size={22} />}
                            label="Dashboard"
                            active={activeTab === 'dashboard'}
                            onClick={() => setActiveTab('dashboard')}
                        />
                        <SidebarItem
                            icon={<FolderKanban size={22} />}
                            label="My Projects"
                            active={activeTab === 'projects'}
                            onClick={() => setActiveTab('projects')}
                        />
                        <SidebarItem
                            icon={<CheckSquare size={22} />}
                            label="My Tasks"
                            active={activeTab === 'tasks'}
                            onClick={() => setActiveTab('tasks')}
                        />
                    </nav>
                </div>

                {/* الجزء السفلي: تسجيل الخروج */}
                <div className="w-full border-t border-neutral-900 pt-4">
                    <SidebarItem
                        icon={<LogOut size={22} />}
                        label="Log Out"
                        danger
                        onClick={() => console.log('Logging out...')}
                    />
                </div>

            </aside>
        </div>
    );
}