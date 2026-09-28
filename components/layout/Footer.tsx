import Link from "next/link";
import { FaGithub, FaLinkedinIn, FaXTwitter, FaDribbble, FaArrowRight } from "react-icons/fa6";

const socials = [
    { name: "GitHub", href: "#", Icon: FaGithub },
    { name: "LinkedIn", href: "#", Icon: FaLinkedinIn },
    { name: "X", href: "#", Icon: FaXTwitter },
    { name: "Dribbble", href: "#", Icon: FaDribbble },
]

const navigate = [
    { label: "Home", href: "/" },
    { label: "Projects", href: "/projects" },
    { label: "Blog", href: "/blog" },
    { label: "About", href: "/about" },
]

const services = [
    { label: "Web Design", href: "/about#services" },
    { label: "Web Development", href: "/about#services" },
    { label: "UI / UX", href: "/about#services" },
    { label: "Learn From Me", href: "/learn/coding-courses" },
]

export default function Footer () {
    return (
        <footer className="border-t border-white/6 bg-[#05000A]">
            <div className="mx-auto w-full px-5 sm:max-w-(--breakpoint-sm) md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-lg) lg:px-20 py-14 md:py-20">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
                    <div className="lg:col-span-5">
                        <Link href="/" className="uppercase font-extrabold bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent text-2xl md:text-3xl">
                            Rogers
                        </Link>
                        <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
                            Full-Stack Developer harnessing AI, design, and code to rapidly deliver intuitive global solutions for startups and institutions.
                        </p>
                        <div className="mt-6 flex gap-3">
                            {socials.map(({ name, href, Icon }) => (
                                <a
                                    key={name}
                                    href={href}
                                    aria-label={name}
                                    className="grid h-10 w-10 place-items-center rounded-full border border-white/6 bg-white/4
                                    text-sm text-muted transition-all duration-300
                                    ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]
                                    hover:-translate-y-1 hover:border-white/15 hover:bg-white/8 hover:text-white"
                                >
                                    <Icon />
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Navigate</h3>
                        <ul className="mt-5 flex flex-col gap-3">
                            {navigate.map(link => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-sm text-muted transition-colors duration-300 hover:text-white">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:col-span-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Services</h3>
                        <ul className="mt-5 flex flex-col gap-3">
                            {services.map(link => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-sm text-muted transition-colors duration-300 hover:text-white">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:col-span-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Start A Project</h3>
                        <p className="mt-5 text-sm leading-relaxed text-muted">
                            Have an idea in mind? I am one message away.
                        </p>
                        <Link href="/start-a-project" className="group mt-5 inline-flex items-center gap-2 rounded-full bg-purple-500 px-5 py-3 text-xs font-bold uppercase tracking-wide transition-all duration-300 hover:bg-purple-400">
                            Let&rsquo;s Talk
                            <FaArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>

                <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/6 pt-6 text-xs text-dim sm:flex-row">
                    <p>&copy; {new Date().getFullYear()} Rogers. All rights reserved.</p>
                    <p>Designed &amp; built with <span className="bg-linear-65/srgb from-accent-1 to-accent-2 bg-clip-text text-transparent font-semibold">passion</span> in Nigeria.</p>
                </div>
            </div>
        </footer>
    )
}