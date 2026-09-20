"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
export function AdminHeader(){const router=useRouter();return <header className="adminHeader"><Link href="/admin" className="wordmark">CHIM<span>®</span> <em>Admin</em></Link><nav aria-label="后台导航"><Link href="/admin">案例管理</Link><Link href="/admin/pdf">PDF 生成</Link></nav><div><Link href="/" target="_blank">查看网站</Link><button onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});router.refresh()}}>退出</button></div></header>}
