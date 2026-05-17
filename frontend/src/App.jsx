import React, { useState, useEffect } from 'react';
import { Mail, Github, Linkedin, Instagram, Phone, Bolt, Cpu, Terminal, MapPin, Upload, FileText, Trash2, Check, AlertCircle, ArrowRight, Download, ChevronRight } from 'lucide-react';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';

// In production (Vercel), both frontend & backend are on the same domain,
// so API_URL is '' (empty = relative URLs like /api/contact).
// In local dev, VITE_API_URL=http://localhost:5000 is set in frontend/.env
const API_URL = import.meta.env.VITE_API_URL || '';

const App = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [certificates, setCertificates] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [profilePic, setProfilePic] = useState('/profile.jpg'); // defaults to new photo in public/profile.jpg
  
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    loadFiles();
    const handleScroll = () => {
      const sections = ['home', 'about', 'skills', 'projects', 'certificates', 'contact'];
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadFiles = async () => {
    try {
      const [certRes, docRes, projRes, profileRes] = await Promise.all([
        fetch(`${API_URL}/api/files/certificates`),
        fetch(`${API_URL}/api/files/documents`),
        fetch(`${API_URL}/api/files/projects`),
        fetch(`${API_URL}/api/files/profile`)
      ]);
      const certData = await certRes.json();
      const docData = await docRes.json();
      const projData = await projRes.json();
      const profileData = await profileRes.json();
      
      if (certData.success) setCertificates(certData.files || []);
      if (docData.success) setDocuments(docData.files || []);
      if (projData.success) setProjects(projData.files || []);
      if (profileData.success && profileData.files?.length > 0) {
        setProfilePic(`${API_URL}${profileData.files[profileData.files.length - 1].path}`);
      }
    } catch (err) {
      console.error('Error loading files:', err);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!isAuthenticated) {
      setContactMessage({ type: 'error', text: 'Admin login required to upload.' });
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', fileType);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setContactMessage({ type: 'success', text: `${fileType} uploaded successfully!` });
        if (fileType === 'profile') setProfilePic(`${API_URL}${data.file.path}?t=${Date.now()}`);
        loadFiles();
      } else setContactMessage({ type: 'error', text: data.message || 'Upload failed' });
    } catch (err) {
      setContactMessage({ type: 'error', text: 'Error uploading file' });
    } finally {
      setUploadLoading(false);
      e.target.value = '';
      setTimeout(() => setContactMessage(null), 3000);
    }
  };

  const deleteFile = async (type, filename) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`${API_URL}/api/files/${type}/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        loadFiles();
        setContactMessage({ type: 'success', text: 'File deleted successfully!' });
        setTimeout(() => setContactMessage(null), 3000);
      }
    } catch (err) {
      setContactMessage({ type: 'error', text: 'Error deleting file' });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        setIsAuthenticated(true);
        setLoginData({ username: '', password: '' });
      } else setLoginError(data.message || 'Login failed');
    } catch (err) {
      setLoginError('Server connection error');
    }
  };

  const navItems = [
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'certificates', label: 'Files' },
    { id: 'contact', label: 'Contact' }
  ];

  // --- Reusable File Section Component ---
  const FileSection = ({ title, files, icon: Icon, type, accept, subtitle }) => (
    <div className="bento-card p-8 flex flex-col h-full relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00e5ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="flex items-center gap-4 mb-8 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#00e5ff]">
          <Icon size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold font-['Space_Grotesk']">{title}</h3>
          <p className="text-sm text-[#8b8b99]">{subtitle}</p>
        </div>
      </div>

      {isAuthenticated && (
        <label className="cursor-pointer mb-6 relative z-10 block">
          <div className="border border-dashed border-[#00e5ff]/30 rounded-2xl p-6 text-center hover:border-[#00e5ff] hover:bg-[#00e5ff]/5 transition-all">
            <Upload className="mx-auto mb-2 text-[#00e5ff]" size={24} />
            <p className="text-sm text-[#8b8b99]">Upload {title}</p>
          </div>
          <input type="file" hidden onChange={(e) => handleFileUpload(e, type)} accept={accept} disabled={uploadLoading} />
        </label>
      )}

      <div className="space-y-3 flex-1 relative z-10 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
        {files.length === 0 ? (
          <p className="text-sm text-[#8b8b99] italic">No {type} uploaded yet.</p>
        ) : (
          files.map((file, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-[#00e5ff]/30 transition-colors group/item"
            >
              <a href={file.path} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white hover:text-[#00e5ff] transition-colors flex-1 truncate">
                <FileText size={18} className="text-[#8b8b99] group-hover/item:text-[#00e5ff] flex-shrink-0" />
                <span className="text-sm truncate">{file.name}</span>
              </a>
              {isAuthenticated && (
                <button onClick={() => deleteFile(type, file.name)} className="text-red-400/50 hover:text-red-400 ml-3 transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <div className="ambient-bg" />
      <div className="mesh-grid" />
      <motion.div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#00e5ff] to-[#00ff88] origin-left z-[1100]" style={{ scaleX }} />

      {/* Modern Floating Navbar */}
      <nav className="fixed top-6 left-0 right-0 z-[1000] flex justify-center px-4 pointer-events-none">
        <div className="bg-[rgba(10,10,15,0.8)] backdrop-blur-2xl border border-white/10 p-2 rounded-full flex items-center justify-between w-full max-w-5xl pointer-events-auto shadow-2xl">
          
          {/* Top Left: Animated Picture & Name */}
          <div className="flex items-center gap-3 pl-2 cursor-pointer" onClick={() => scrollToSection('home')}>
            {profilePic ? (
              <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-r from-[#00e5ff] to-[#00ff88]">
                <motion.img src={profilePic} alt="Avinash" className="w-full h-full rounded-full object-cover border-[3px] border-[#0a0a0f]"
                  animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00e5ff] to-[#00ff88] p-[2px]">
                <div className="w-full h-full bg-[#0a0a0f] rounded-full flex items-center justify-center text-xs font-bold text-white">AS</div>
              </div>
            )}
            <span className="font-['Space_Grotesk'] font-bold text-lg hidden sm:block tracking-wide">AVINASH<span className="text-[#00e5ff]">.</span></span>
          </div>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => scrollToSection(item.id)} className={`nav-pill ${activeSection === item.id ? 'active' : ''}`}>
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Side: Admin / CV */}
          <div className="flex items-center gap-2 pr-2">
            <button onClick={() => setShowAdminPanel(!showAdminPanel)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-[#8b8b99] hover:text-white border border-white/5">
              <Bolt size={18} />
            </button>
            <a href="/assets/Avinash-new-Cv.pdf" download className="hidden sm:flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:scale-105 transition-transform">
              CV <Download size={14} />
            </a>
          </div>
        </div>
      </nav>

      {/* Admin Panel Drawer */}
      <AnimatePresence>
        {showAdminPanel && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-28 right-4 md:right-[10%] z-[900] w-80 bento-card p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-['Space_Grotesk'] font-bold text-lg">Admin Control</h3>
              <Bolt className="text-[#00e5ff]" size={20} />
            </div>
            
            {!isAuthenticated ? (
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">{loginError}</p>}
                <input type="text" placeholder="Username" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#00e5ff] outline-none transition-colors"
                  value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} />
                <input type="password" placeholder="Password" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#00e5ff] outline-none transition-colors"
                  value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} />
                <button type="submit" className="w-full bg-gradient-to-r from-[#00e5ff] to-[#00ff88] text-black font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity">Login</button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                  <Check className="text-green-400" size={18} />
                  <span className="text-sm text-green-400 font-medium">Logged in successfully</span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-[#8b8b99] uppercase tracking-wider font-semibold">Update Profile Picture</label>
                  <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
                    <Upload size={16} className="text-[#00e5ff]" />
                    <span className="text-sm">Select Image</span>
                    <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, 'profile')} disabled={uploadLoading} />
                  </label>
                </div>

                <button onClick={() => { localStorage.removeItem('token'); setIsAuthenticated(false); }} className="w-full border border-red-500/30 text-red-400 py-3 rounded-xl text-sm hover:bg-red-500/10 transition-colors font-semibold">
                  Logout
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-6 pb-32">
        
        {/* Premium Hero Section */}
        <section id="home" className="min-h-screen flex items-center justify-center pt-20">
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]"></span></span>
                <span className="text-xs font-medium text-[#8b8b99] tracking-wider uppercase">Available for work</span>
              </div>
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black font-['Space_Grotesk'] tracking-tighter leading-[1.1] mb-6">
                Hello I am<br />
                <span className="gradient-text">Avinash Sah</span>
              </h1>
              <p className="text-xl sm:text-2xl text-white font-light mb-10 border-l-2 border-[#00e5ff] pl-6">
                <span className="gradient-text-accent font-semibold">Electrical and Electronic Engineering</span>
                <br /><span className="text-[#8b8b99] text-lg mt-2 inline-block">Specializing in Power Systems, EVs, & Industrial Automation.</span>
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button onClick={() => scrollToSection('projects')} className="px-8 py-4 rounded-full bg-white text-black font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                  View Projects <ArrowRight size={18} />
                </button>
                <div className="flex items-center gap-2 px-6 py-4 rounded-full border border-white/10 bg-white/5">
                  {[
                    { icon: Linkedin, url: "https://linkedin.com" },
                    { icon: Github, url: "https://github.com" },
                    { icon: Mail, url: "mailto:avinashsah271@gmail.com" }
                  ].map((social, i) => (
                    <a key={i} href={social.url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-colors text-[#8b8b99]">
                      <social.icon size={18} />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2 }} className="relative hidden lg:block h-[600px]">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00e5ff]/20 to-[#00ff88]/20 rounded-[3rem] blur-3xl opacity-50"></div>
              {profilePic ? (
                <div className="absolute inset-0 rounded-[3rem] p-1 bg-gradient-to-br from-white/20 to-white/0">
                  <div className="w-full h-full rounded-[2.9rem] overflow-hidden bg-[#0a0a0f]">
                    <img src={profilePic} alt="Avinash" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500 hover:scale-105" />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bento-card flex flex-col items-center justify-center text-center p-12">
                  <Cpu size={64} className="text-[#00e5ff] mb-6 opacity-50" />
                  <h3 className="text-2xl font-bold font-['Space_Grotesk'] text-white/50">Engineering the Future</h3>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* Bento Grid: About & Skills */}
        <section id="about" className="pt-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* About Box */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="md:col-span-2 bento-card p-10 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-bold font-['Space_Grotesk'] mb-6 flex items-center gap-3">
                  <Terminal className="text-[#00e5ff]" /> My Vision
                </h2>
                <p className="text-lg text-[#8b8b99] leading-relaxed">
                  I am a passionate and dedicated <span className="text-white font-medium">Electrical and Electronic Engineering</span> student with a strong interest in power systems, automation, embedded systems, and modern technologies. I enjoy learning new technical concepts and applying them through practical projects, industrial training, and problem-solving activities. I have worked on projects such as an Inverse Over-Current Relay using Arduino Uno, current and voltage sensors, relays, and electrical load control systems, which helped me gain practical knowledge in circuit design, electrical protection, hardware interfacing, and troubleshooting.
                </p>
                <p className="text-lg text-[#8b8b99] leading-relaxed mt-4">
                  I also have an interest in programming, electronics, and technology development, and I continuously work on improving my technical and creative skills. I have gained experience in industrial electrical systems, machine operations, maintenance practices, and safety procedures through practical learning and technical exposure. I am a hardworking, self-motivated, and quick learner who believes in teamwork, discipline, innovation, and continuous improvement, with the goal of building a successful career in the field of Electrical and Electronic Engineering.
                </p>
              </div>
              <div className="mt-10 flex items-center gap-6">
                <div className="flex items-center gap-2"><MapPin size={18} className="text-[#00ff88]"/> <span className="text-sm font-medium">Punjab, India</span></div>
                <div className="flex items-center gap-2"><Cpu size={18} className="text-[#00e5ff]"/> <span className="text-sm font-medium">LPU B.Tech EEE</span></div>
              </div>
            </motion.div>

            {/* Core Skills Box */}
            <motion.div id="skills" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bento-card p-10 bg-gradient-to-b from-[#00e5ff]/5 to-transparent">
              <h2 className="text-2xl font-bold font-['Space_Grotesk'] mb-8">Expertise</h2>
              <div className="space-y-6">
                {[
                  { title: "Power Systems", level: 90 },
                  { title: "EV Architecture", level: 85 },
                  { title: "PLC Automation", level: 80 },
                  { title: "Circuit Design", level: 95 }
                ].map((skill, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-white">{skill.title}</span>
                      <span className="text-[#00e5ff]">{skill.level}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${skill.level}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-gradient-to-r from-[#00e5ff] to-[#00ff88] rounded-full"></motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Tools Box */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-6 bento-card p-10">
            <h3 className="text-sm font-bold tracking-widest uppercase text-[#8b8b99] mb-6">Software Arsenal</h3>
            <div className="flex flex-wrap gap-3">
              {['MATLAB', 'Proteus', 'AutoCAD', 'Creo', 'Tinkercad', 'Wokwi', 'LogixPro', 'Multisim'].map((tool, i) => (
                <span key={i} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm font-medium hover:border-[#00e5ff] hover:text-[#00e5ff] transition-colors cursor-default">
                  {tool}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Projects Showcase */}
        <section id="projects" className="pt-32">
          <h2 className="text-4xl font-bold font-['Space_Grotesk'] mb-12 flex items-center gap-4">
            <Bolt className="text-[#00e5ff]" size={36} /> Featured Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Automatic Object Counting & Segregation",
                category: "Hardware & Software Integration",
                date: "May 2026",
                desc: "Designed and implemented a complete hardware and software solution for automatic counting and segregation of objects using sensors, microcontrollers, and custom software logic.",
                tags: ["Hardware", "Software", "Sensors", "Automation"],
                link: "https://dashboard-scada-system--avinashsah271.replit.app"
              },
              {
                title: "Intelligent Grid Analysis",
                category: "Power System Analysis",
                date: "Nov 2025",
                desc: "Developed web platform for power system load flow analysis using Flask backend, Pandas/NumPy/SciPy; implemented Gauss-Seidel & Newton-Raphson methods.",
                tags: ["Flask", "Python", "Power Systems"]
              },
              {
                title: "DC-DC Boost Converter for EVs",
                category: "Power Electronics & EV Technology",
                date: "Dec 2025",
                desc: "Designed and built a DC-DC boost converter using inductor, diode, MOSFET, capacitor, and PWM control; analyzed voltage gain and efficiency for electric vehicles and power electronics applications.",
                tags: ["Hardware", "Power Electronics", "Circuit Design", "EVs"]
              },
              {
                title: "Auto Garage Door Opener",
                category: "Industrial Automation",
                date: "Jan 2026",
                desc: "Simulated an automatic garage door opener using LogixPro and ladder logic; implemented sensors, timers, and safety interlocks for door operation control.",
                tags: ["PLC", "Ladder Logic", "Automation"]
              }
            ].map((proj, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="bento-card p-8 group hover:-translate-y-2 transition-transform duration-300 flex flex-col h-full">
                <div className="text-[#00e5ff] text-sm font-bold mb-2 tracking-wider">{proj.date}</div>
                <h3 className="text-2xl font-bold font-['Space_Grotesk'] mb-2">{proj.title}</h3>
                <h4 className="text-white/50 text-sm mb-4">{proj.category}</h4>
                <p className="text-[#8b8b99] text-sm leading-relaxed mb-6 flex-grow">{proj.desc}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {proj.tags.map((tag, j) => (
                    <span key={j} className="text-xs px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/70">{tag}</span>
                  ))}
                </div>
                {proj.link && (
                  <a href={proj.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center w-fit gap-1.5 text-sm font-bold text-white hover:text-[#00e5ff] transition-colors group/link mt-auto pt-4 border-t border-white/10">
                    Launch Dashboard <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Education & Training */}
        <section id="education" className="pt-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Education */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bento-card p-10">
              <h2 className="text-3xl font-bold font-['Space_Grotesk'] mb-8 flex items-center gap-3"><MapPin className="text-[#00ff88]"/> Education</h2>
              <div className="space-y-8">
                <div className="relative pl-6 border-l-2 border-[#00e5ff]/30">
                  <div className="absolute w-3 h-3 bg-[#00e5ff] rounded-full -left-[7px] top-1.5 shadow-[0_0_10px_#00e5ff]"></div>
                  <h3 className="text-xl font-bold">Lovely Professional University</h3>
                  <p className="text-[#00ff88] text-sm mb-2">B.Tech EEE • Aug 2023 - Present</p>
                  <p className="text-[#8b8b99] text-sm">CGPA: 6.60</p>
                </div>
                <div className="relative pl-6 border-l-2 border-[#00e5ff]/30">
                  <div className="absolute w-3 h-3 bg-white/20 rounded-full -left-[7px] top-1.5 border border-[#00e5ff]"></div>
                  <h3 className="text-xl font-bold">SRM Institute of Engineering</h3>
                  <p className="text-[#00ff88] text-sm mb-2">Diploma Mechanical • Sep 2020 - Jul 2023</p>
                  <p className="text-[#8b8b99] text-sm">Percentage: 70%</p>
                </div>
                <div className="relative pl-6 border-l-2 border-transparent">
                  <div className="absolute w-3 h-3 bg-white/20 rounded-full -left-[7px] top-1.5 border border-[#00e5ff]"></div>
                  <h3 className="text-xl font-bold">New Rose Public School</h3>
                  <p className="text-[#00ff88] text-sm mb-2">Matriculation • Apr 2020</p>
                  <p className="text-[#8b8b99] text-sm">GPA: 3.85</p>
                </div>
              </div>
            </motion.div>

            {/* Certifications & Training */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bento-card p-10">
              <h2 className="text-3xl font-bold font-['Space_Grotesk'] mb-8 flex items-center gap-3"><FileText className="text-[#00e5ff]"/> Training & Certs</h2>
              <div className="space-y-6">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <h3 className="text-lg font-bold text-white mb-1">Mastering PLCs for Industrial Automation</h3>
                  <p className="text-sm text-[#00e5ff] mb-2">Interstump • Jun-Jul 2025</p>
                  <p className="text-xs text-[#8b8b99] leading-relaxed">Hands-on training in PLC programming, ladder logic design, HMI, SCADA basics, and real-time troubleshooting for industrial applications.</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-[#00e5ff]/50 transition-colors">
                  <div>
                    <h3 className="font-bold text-white text-sm">Data Base Management System</h3>
                    <p className="text-xs text-[#8b8b99]">NPTEL Online</p>
                  </div>
                  <span className="text-xs text-[#00ff88] font-bold bg-[#00ff88]/10 px-2 py-1 rounded">Oct 2025</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-[#00e5ff]/50 transition-colors">
                  <div>
                    <h3 className="font-bold text-white text-sm">Electric Vehicle Technology</h3>
                    <p className="text-xs text-[#8b8b99]">Udemy</p>
                  </div>
                  <span className="text-xs text-[#00ff88] font-bold bg-[#00ff88]/10 px-2 py-1 rounded">Oct 2023</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Files & Certificates Section (Combined Admin/Public) */}
        <section id="certificates" className="pt-32">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-bold font-['Space_Grotesk']">Projects & Certificates</h2>
            {isAuthenticated && <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">Admin Mode Active</span>}
          </div>
          
          {contactMessage && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-2xl mb-8 flex items-center gap-3 ${contactMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {contactMessage.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
              <span className="font-medium">{contactMessage.text}</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FileSection title="Projects" subtitle="Source code & reports" files={projects} icon={Bolt} type="projects" accept=".pdf,.zip,.doc,.docx,.txt,.md" />
            <FileSection title="Certificates" subtitle="Professional achievements" files={certificates} icon={FileText} type="certificates" accept=".pdf,.png,.jpg,.jpeg" />
          </div>
        </section>

        {/* Premium Contact Section */}
        <section id="contact" className="pt-32">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bento-card p-12 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#2f00ff]/20 to-transparent rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
              <div>
                <h2 className="text-5xl font-bold font-['Space_Grotesk'] mb-6 tracking-tight">Let's build the<br/><span className="gradient-text-accent">future together.</span></h2>
                <p className="text-[#8b8b99] text-lg mb-12 max-w-md">Open to exciting opportunities in electrical engineering, smart grids, and EV innovations.</p>
                
                <div className="space-y-6">
                  <a href="mailto:avinashsah271@gmail.com" className="flex items-center gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#00e5ff]/10 group-hover:border-[#00e5ff]/30 transition-all">
                      <Mail className="text-[#8b8b99] group-hover:text-[#00e5ff]" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-[#8b8b99]">Email</p>
                      <p className="font-medium text-white">avinashsah271@gmail.com</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#00ff88]/10 group-hover:border-[#00ff88]/30 transition-all">
                      <Phone className="text-[#8b8b99] group-hover:text-[#00ff88]" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-[#8b8b99]">Phone</p>
                      <p className="font-medium text-white">+91 62847 46451</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setContactLoading(true);
                  const data = Object.fromEntries(new FormData(e.target));
                  try {
                    const res = await fetch(`${API_URL}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                    const result = await res.json();
                    setContactMessage({ type: result.success ? 'success' : 'error', text: result.success ? 'Message sent successfully!' : result.message });
                    if (result.success) e.target.reset();
                  } catch (err) {
                    setContactMessage({ type: 'error', text: 'Connection error' });
                  } finally {
                    setContactLoading(false);
                    setTimeout(() => setContactMessage(null), 5000);
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="name" placeholder="Name" required className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-2xl focus:border-[#00e5ff] focus:bg-white/10 outline-none transition-all text-sm" />
                    <input type="email" name="email" placeholder="Email" required className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-2xl focus:border-[#00e5ff] focus:bg-white/10 outline-none transition-all text-sm" />
                  </div>
                  <textarea name="message" placeholder="Project details or message..." rows="4" required className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-2xl focus:border-[#00e5ff] focus:bg-white/10 outline-none transition-all text-sm resize-none"></textarea>
                  
                  <button type="submit" disabled={contactLoading} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:scale-[1.02] transition-transform flex justify-center items-center gap-2">
                    {contactLoading ? 'Sending...' : 'Send Message'} <ChevronRight size={18} />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="py-8 text-center border-t border-white/5 mt-20">
        <p className="text-[#8b8b99] text-sm">&copy; 2026 Avinash Sah. Engineered with precision.</p>
      </footer>
    </div>
  );
};

export default App;
