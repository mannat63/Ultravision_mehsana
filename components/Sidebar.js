"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, GraduationCap, BookOpen, Layers, IndianRupee, CalendarCheck, Calendar, FileText, Settings, PieChart, ChevronRight, HelpCircle, Trash2, MoreHorizontal, X, Lock, Target } from "lucide-react";

const adminLinks = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, badge: "icon-badge-orange" },
  { href: "/students", label: "Students", Icon: Users, badge: "icon-badge-blue" },
  { href: "/teachers", label: "Teachers", Icon: GraduationCap, badge: "icon-badge-purple" },
  { href: "/subjects", label: "Courses & Subjects", Icon: BookOpen, badge: "icon-badge-amber" },
  { href: "/sections", label: "Classes & Sections", Icon: Layers, badge: "icon-badge-teal" },
  { href: "/timetable", label: "Timetable", Icon: Calendar, badge: "icon-badge-indigo" },
  { href: "/fees", label: "Fees", Icon: IndianRupee, badge: "icon-badge-green" },
  { href: "/attendance", label: "Attendance", Icon: CalendarCheck, badge: "icon-badge-blue" },
  { href: "/tests", label: "Tests & Results", Icon: FileText, badge: "icon-badge-purple" },
  { href: "/reports", label: "Reports", Icon: PieChart, badge: "icon-badge-orange" },
  { href: "/leads", label: "Leads & CRM", Icon: Target, badge: "icon-badge-amber", locked: true },
  { href: "/recycle-bin", label: "Recycle Bin", Icon: Trash2, badge: "icon-badge-red" },
  { href: "/automation", label: "Settings", Icon: Settings, badge: "icon-badge-slate" },
];

const teacherLinks = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, badge: "icon-badge-orange" },
  { href: "/sections", label: "My Sections", Icon: Layers, badge: "icon-badge-teal" },
  { href: "/timetable", label: "Timetable", Icon: Calendar, badge: "icon-badge-indigo" },
  { href: "/attendance", label: "Attendance", Icon: CalendarCheck, badge: "icon-badge-blue" },
  { href: "/attendance-calendar", label: "Calendar", Icon: Calendar, badge: "icon-badge-purple" },
  { href: "/homework", label: "Homework", Icon: FileText, badge: "icon-badge-amber" },
  { href: "/tests", label: "Results", Icon: FileText, badge: "icon-badge-green" },
];

const studentLinks = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, badge: "icon-badge-orange" },
  { href: "/timetable", label: "Timetable", Icon: Calendar, badge: "icon-badge-indigo" },
  { href: "/attendance", label: "Attendance", Icon: CalendarCheck, badge: "icon-badge-blue" },
  { href: "/homework", label: "Homework", Icon: FileText, badge: "icon-badge-amber" },
  { href: "/fees", label: "Fees", Icon: IndianRupee, badge: "icon-badge-green" },
  { href: "/tests", label: "Results", Icon: FileText, badge: "icon-badge-purple" },
  { href: "/reports", label: "My Report", Icon: PieChart, badge: "icon-badge-orange" },
];

const roleLinksMap = {
  ADMIN: adminLinks,
  TEACHER: teacherLinks,
  STUDENT: studentLinks,
};

// Pick the 4 most important links for bottom bar per role
const mobileBottomLinks = {
  ADMIN: ["/dashboard", "/students", "/attendance", "/fees"],
  TEACHER: ["/dashboard", "/attendance", "/homework", "/tests"],
  STUDENT: ["/dashboard", "/attendance", "/homework", "/tests"],
};

/* ─── Desktop Sidebar (hidden on mobile) ─── */
function DesktopSidebar({ role, userName, links, pathname, onOpenNotification }) {
  return (
    <aside
      className="group bg-white hidden md:flex flex-col m-4 rounded-[32px] transition-all duration-300 ease-in-out border border-white/50 z-50 print:hidden overflow-hidden"
      style={{
        width: '80px',
        height: 'calc(100vh - 32px)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08), 0 2px 10px rgba(0,0,0,0.03)'
      }}
      onMouseEnter={(e) => e.currentTarget.style.width = '240px'}
      onMouseLeave={(e) => e.currentTarget.style.width = '80px'}
    >
      {/* Brand */}
      <div className="py-6 flex-shrink-0 flex items-center px-[16px]">
        <div className="w-12 h-12 rounded-[20px] bg-white flex flex-shrink-0 items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
          <img src="/uv_meh_logo.png" alt="UltraVision Academy" className="w-[85%] h-[85%] object-contain" />
        </div>
        <div className="flex-col ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-32 overflow-hidden whitespace-nowrap">
          <span className="block font-extrabold text-gray-900 text-[13px] leading-tight tracking-tight uppercase">UltraVision</span>
          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-0.5">Academy</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 flex flex-col gap-2 overflow-y-auto overflow-x-hidden no-scrollbar w-full px-[12px]">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const { Icon, locked } = link;
          
          if (locked) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center w-[216px] p-2 rounded-2xl transition-all duration-200 relative text-gray-400 hover:bg-gray-50 group/locked"
                title={link.label}
              >
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl opacity-60">
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <span className="ml-3 font-medium text-[13px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap flex-1 pr-[80px] truncate">
                  {link.label}
                </span>

                {/* Premium badge */}
                <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 shadow-sm whitespace-nowrap">
                    <Lock size={10} className="text-amber-500" /> Premium
                  </span>
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => {
                if (link.href === "#notifications") {
                  e.preventDefault();
                  if (onOpenNotification) onOpenNotification();
                }
              }}
              className={`flex items-center w-[216px] p-2 rounded-2xl transition-all duration-200 relative ${
                isActive
                  ? "bg-gray-900 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
              title={link.label}
            >
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl">
                <Icon size={20} className={isActive ? "text-white" : ""} strokeWidth={isActive ? 2 : 1.8} />
              </div>
              <span className="ml-3 font-medium text-[13px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap flex-1">
                {link.label}
              </span>
              {isActive && (
                <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ChevronRight size={14} className="text-white/50" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Area */}
      <div className="pb-6 pt-2 flex-shrink-0 flex flex-col gap-2 w-full px-[12px]">
        {role !== "STUDENT" && (
          <a
            href="https://wa.me/919509728788?text=Hi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center w-[216px] p-2 rounded-2xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
            title="Help & Support"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl">
              <HelpCircle size={20} strokeWidth={1.8} />
            </div>
            <span className="ml-3 font-medium text-[13px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              Help & Support
            </span>
          </a>
        )}

        <div className="flex items-center p-2 rounded-2xl bg-gray-50 border border-gray-100 w-[216px]">
          <div className="flex-shrink-0 w-10 h-10 rounded-[16px] bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            {(userName || "U")[0].toUpperCase()}
          </div>
          <div className="ml-3 flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap min-w-0">
            <div className="text-[13px] font-bold text-gray-800 truncate w-24" title={userName}>{userName}</div>
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ─── Mobile Bottom Bar + More Sheet (visible only on mobile) ─── */
function MobileBottomBar({ role, links, pathname, onClose }) {
  const [showMore, setShowMore] = useState(false);
  const bottomHrefs = mobileBottomLinks[role] || mobileBottomLinks.STUDENT;
  const bottomItems = bottomHrefs.map(href => links.find(l => l.href === href)).filter(Boolean);
  const remainingItems = links.filter(l => !bottomHrefs.includes(l.href));

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 print:hidden" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-around px-1 py-1.5 safe-area-bottom">
          {bottomItems.map((link) => {
            const isActive = pathname === link.href;
            const { Icon } = link;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => { if (onClose) onClose(); }}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all min-w-[56px] ${
                  isActive
                    ? "text-gray-900"
                    : "text-gray-400"
                }`}
              >
                <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isActive ? "bg-gray-900 text-white shadow-sm" : ""}`}>
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.6} />
                </div>
                <span className={`text-[9px] font-bold tracking-wide ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                  {link.label.length > 10 ? link.label.split(" ")[0] : link.label}
                </span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all min-w-[56px] ${showMore ? "text-gray-900" : "text-gray-400"}`}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-xl ${showMore ? "bg-gray-900 text-white shadow-sm" : ""}`}>
              <MoreHorizontal size={18} strokeWidth={1.6} />
            </div>
            <span className="text-[9px] font-bold tracking-wide">More</span>
          </button>
        </div>
      </div>

      {/* More Sheet Overlay */}
      {showMore && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '70vh', boxShadow: '0 -10px 40px rgba(0,0,0,0.12)' }}
          >
            {/* Sheet Handle */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white overflow-hidden border border-gray-100 flex items-center justify-center">
                  <img src="/uv_meh_logo.png" alt="UltraVision Academy" className="w-6 h-6 object-contain" />
                </div>
                <span className="text-sm font-bold text-gray-900">All Pages</span>
              </div>
              <button onClick={() => setShowMore(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <X size={16} />
              </button>
            </div>

            {/* All remaining links */}
            <div className="p-4 grid grid-cols-3 gap-2 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 60px)' }}>
              {remainingItems.map((link) => {
                const isActive = pathname === link.href;
                const { Icon, locked } = link;
                
                if (locked) {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => { setShowMore(false); if (onClose) onClose(); }}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl transition-all bg-gray-50/50 border border-gray-100/50 text-gray-400 relative"
                    >
                      <Icon size={20} strokeWidth={1.6} className="opacity-60" />
                      <span className="text-[10px] font-bold text-center leading-tight opacity-60">{link.label}</span>
                      <span className="absolute top-1 right-1 flex items-center gap-0.5 text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <Lock size={8} /> PRO
                      </span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => { setShowMore(false); if (onClose) onClose(); }}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all ${
                      isActive
                        ? "bg-gray-900 text-white shadow-md"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                    <span className="text-[10px] font-bold text-center leading-tight">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Sidebar({ role, userName, showFees = false, onClose, onOpenNotification }) {
  const pathname = usePathname();
  let links = roleLinksMap[role] || studentLinks;

  // Fee section is hidden from students/parents unless the academy turns it on.
  if (role === "STUDENT" && !showFees) {
    links = links.filter((l) => l.href !== "/fees");
  }

  return (
    <>
      <DesktopSidebar
        role={role}
        userName={userName}
        links={links}
        pathname={pathname}
        onOpenNotification={onOpenNotification}
      />
      <MobileBottomBar
        role={role}
        links={links}
        pathname={pathname}
        onClose={onClose}
      />
    </>
  );
}
