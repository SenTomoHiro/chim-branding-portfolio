"use client";
import Link from "next/link";
import { navigateAdmin } from "./admin-navigation";
export function AdminHeader({ onLogout }: { onLogout: () => void | Promise<void> }){return <header className="adminHeader"><Link href="/admin" className="wordmark" onClick={navigateAdmin}>CHIM<span>®</span> <em>Admin</em></Link><nav aria-label="后台导航"><Link href="/admin" onClick={navigateAdmin}>案例管理</Link><Link href="/admin/pdf" onClick={navigateAdmin}>PDF 生成</Link></nav><div><Link href="/" target="_blank">查看网站</Link><button onClick={() => void onLogout()}>退出</button></div></header>}
