"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { TypeAnimation } from "react-type-animation"
import MainImage from '@/assets/images/hero-image.png'
import OutLineImage from '@/assets/images/hero-image-outline-main.png'

const rotatingWords = [
  'Magic',
  1800,
  'Websites',
  1800,
  'Designs',
  1800,
  'Systems',
  1800,
  'Web Apps',
  1800,
]

export default function Hero () {
    return (
        <section className="hero-section">
            <div className="main hero-inner hero-bg">
                <motion.span className="grad-badge" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                  Yo! Whats Up? 👋🏽
                </motion.span>

                <motion.h1 className="hero-title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}>
                    Let's create&nbsp;
                    <span className="rotating-words grad-text">
                      <TypeAnimation sequence={rotatingWords} wrapper="span" cursor={true} repeat={Infinity} style={{display: 'inline-block'}} speed={60} />
                    </span>
                    <br />together
                </motion.h1>

                <motion.div className="hero-visual" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.22 }}>
                    <div className="hero-avatar-container">
                        <Image src={MainImage} className="hero-avatar" alt="Hero Image" width={840} height={840} />
                        <Image src={OutLineImage} alt="Rogers - Full-stack Developer" className="hero-avatar-border" width={880} height={880} />
                        <div className="scan-line-mask"></div>
                    </div>
                </motion.div>

                <motion.div className="hero-bottom" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.32 }}>
                <div className="hero-bottom-left">
                    <p className="hero-tagline">Full-Stack Designer harnessing AI, design, and code to rapidly deliver intuitive global solutions for startups and financial institutions.</p>
                    <a href="#" target="_blank" rel="noopener" download className="btn-text hero-profile-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1.1em" height="1.1em" viewBox="0 0 512 512" fill="currentColor"><path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5 12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/></svg>
                    Corporate Profile
                    </a>
                </div>
                <a href="start-a-project/" className="flex justify-center items-center gap-2 bg-purple-500 py-3 px-4 rounded-full w-full md:w-auto">
                    <span className="hero-cta-text">LET'S WORK</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 17 17" fill="none"><path d="M9.1497 0.80204C9.26529 3.95101 13.2299 6.51557 16.1451 8.0308L16.1447 9.43036C13.2285 10.7142 9.37889 13.1647 9.37789 16.1971L7.27855 16.1978C7.16304 12.8156 10.6627 10.4818 13.1122 9.66462L0.049716 9.43565L0.0504065 7.33631L13.1129 7.56528C10.5473 6.86634 6.93261 4.18504 7.05036 0.80273L9.1497 0.80204Z" fill="currentColor"/></svg>
                </a>
                </motion.div>


            </div>
        </section>
    )
}
