require("dotenv").config();
const express=require("express"), path=require("path"), session=require("express-session"), Database=require("better-sqlite3");
const app=express(), PORT=Number(process.env.PORT)||3000;
const db=new Database(path.join(__dirname,"orvella.db"));
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS bookings(
id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT NOT NULL,email TEXT,event_type TEXT NOT NULL,event_date TEXT,guests INTEGER,location TEXT,budget TEXT,message TEXT,created_at TEXT NOT NULL DEFAULT(datetime('now','localtime')));
CREATE TABLE IF NOT EXISTS enquiries(
id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT NOT NULL,email TEXT,subject TEXT,message TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now','localtime')));`);
app.use(express.urlencoded({extended:true})); app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));
app.use(session({secret:process.env.SESSION_SECRET||"orvella-development-secret",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:14400000}}));
function adminOnly(req,res,next){if(req.session?.isAdmin)return next();res.redirect("/admin-login")}
app.get("/",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.get("/admin-login",(req,res)=>req.session?.isAdmin?res.redirect("/admin"):res.sendFile(path.join(__dirname,"views","admin-login.html")));
app.post("/admin-login",(req,res)=>{const u=String(req.body.username||"").trim(),p=String(req.body.password||"");if(u===(process.env.ADMIN_USERNAME||"Orvella")&&p===(process.env.ADMIN_PASSWORD||"Sucess@123")){req.session.isAdmin=true;req.session.username=u;return res.redirect("/admin")}res.redirect("/admin-login?error=1")});
app.post("/logout",(req,res)=>req.session.destroy(()=>res.redirect("/admin-login")));
app.get("/admin",adminOnly,(req,res)=>res.sendFile(path.join(__dirname,"views","admin.html")));
app.post("/api/bookings",(req,res)=>{const b=req.body;if(!b.name||!b.phone||!b.event_type)return res.status(400).json({success:false,message:"Name, phone number and event type are required."});const r=db.prepare(`INSERT INTO bookings(name,phone,email,event_type,event_date,guests,location,budget,message) VALUES(?,?,?,?,?,?,?,?,?)`).run(String(b.name).trim(),String(b.phone).trim(),String(b.email||"").trim(),String(b.event_type).trim(),String(b.event_date||"").trim(),b.guests?Number(b.guests):null,String(b.location||"").trim(),String(b.budget||"").trim(),String(b.message||"").trim());res.json({success:true,id:r.lastInsertRowid})});
app.post("/api/enquiries",(req,res)=>{const b=req.body;if(!b.name||!b.phone||!b.message)return res.status(400).json({success:false,message:"Name, phone number and message are required."});const r=db.prepare(`INSERT INTO enquiries(name,phone,email,subject,message) VALUES(?,?,?,?,?)`).run(String(b.name).trim(),String(b.phone).trim(),String(b.email||"").trim(),String(b.subject||"").trim(),String(b.message).trim());res.json({success:true,id:r.lastInsertRowid})});
app.get("/api/admin/data",adminOnly,(req,res)=>{const bookings=db.prepare("SELECT * FROM bookings ORDER BY id DESC").all(),enquiries=db.prepare("SELECT * FROM enquiries ORDER BY id DESC").all();res.json({bookings,enquiries,stats:{bookings:bookings.length,enquiries:enquiries.length}})});
app.delete("/api/admin/bookings/:id",adminOnly,(req,res)=>{db.prepare("DELETE FROM bookings WHERE id=?").run(Number(req.params.id));res.json({success:true})});
app.delete("/api/admin/enquiries/:id",adminOnly,(req,res)=>{db.prepare("DELETE FROM enquiries WHERE id=?").run(Number(req.params.id));res.json({success:true})});
app.use((req,res)=>res.status(404).send('<h1>404 - Page not found</h1><p><a href="/">Return to Orvella Events</a></p>'));
app.listen(PORT,()=>console.log(`Orvella Events running at http://localhost:${PORT}`));
