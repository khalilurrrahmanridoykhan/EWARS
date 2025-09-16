import Header from '@/page/Header'
import React from 'react'
import { Outlet } from 'react-router-dom'

function AdminLayout() {
    return (
        <div>
            <Header />
            <main className="flex-1 overflow-y-auto bg-[#f5f5f5] p-4">
                <Outlet />
            </main>
        </div>
    )
}
export default AdminLayout