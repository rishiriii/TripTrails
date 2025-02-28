document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle - Updated to match home.js functionality
    function initializeMobileMenu() {
        const menuToggle = document.querySelector(".menu-toggle");
        const navLinks = document.querySelector(".nav-links");
        
        if (menuToggle && navLinks) {
            menuToggle.addEventListener("click", () => {
                menuToggle.classList.toggle("active");
                navLinks.classList.toggle("active");
            });
        }
    }

    // Scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
        observer.observe(el);
    });

    // Initialize mobile menu
    initializeMobileMenu();

    // Header scroll effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
});