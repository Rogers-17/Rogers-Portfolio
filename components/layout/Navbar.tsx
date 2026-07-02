"use client"
import Link from "next/link";
import Logo from "../ui/Logo";
import Menu from '@/components/ui/Menu'
import * as React from 'react'
import { AiOutlineArrowDown, AiFillX } from 'react-icons/ai';
import { FaArrowDown, FaArrowRight } from 'react-icons/fa';
import { NavbarMenu } from "@/utils/data";

export default function Navbar () {

    const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null)
    const [isOpen, setIsOpen] = React.useState<boolean>(false)
    const menuItems = NavbarMenu

    return (
        <section className="sticky top-0 z-50 backdrop-blur-md bg-primary py-4 text-white">
            <main className="main">
            <nav className="flex items-center justify-between">
                <Link href={'/'}>
                    <Logo />
                </Link>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="lg:hidden" >
                    {isOpen ? (
                        <div>x</div>
                    ) : (
                        <Menu />
                    )}
                </button>
                <div className="hidden lg:flex items-center gap-8 text-sm font-bold">
                    {menuItems.map(menu => (
                        <div
                        key={menu.menu}
                        className="relative"
                        onMouseEnter={() => menu.hasDropdown && setActiveDropdown(menu.menu)}
                        onMouseLeave={() => setActiveDropdown(null)}
                        >
                            <Link
                                key={menu.menu}
                                href={menu.href}
                                className="flex items-center gap-1 transition-colors duration-200 hover:text- uppercase"
                            >
                                {menu.menu} {menu.hasDropdown && <AiOutlineArrowDown />}
                            </Link>
                            
                            {menu.hasDropdown && activeDropdown === menu.menu && (
                                <div className="text-sm absolute left-0 top-full mt-3 w-56 rounded-xl border border-gray-100 bg-white p-2 text-muted shadow-2xl z-50">
                                    {menu.submenu?.map(submenu => (
                                        <Link 
                                        href={submenu.href}
                                        key={submenu.menu} 
                                        className="block p-2 hover:bg-gray-100 rounded">
                                            {submenu.menu}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="text-sm font-bold transition-all duration-100 ease-in-out uppercase grad-text hidden lg:flex">
                    <div className="flex justify-center items-center gap-2">
                        Start A Project <FaArrowRight size={10} className="grad-text text-purple-500"/>
                    </div>
                </div>
            </nav>
            
            <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${ isOpen ? "max-h-120 opacity-100" : "max-h-0 opacity-0" } `}>
                <div className="flex flex-col gap-2 py-5">
                    {menuItems.map(link => (
                        <Link
                            key={link.menu}
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg px-4 py-3 transition hover:bg-white/10">
                            {link.menu}
                        </Link>
                    ))}
                    <button
                        className=" mt-3 w-full rounded-xl border  border-white/40 bg-transparent 
                        py-3 transition duration-300  hover:bg-white  hover:text-primary "
                    >
                        Download App
                    </button>

                </div>
            </div>
            </main>
        </section>
    )
}