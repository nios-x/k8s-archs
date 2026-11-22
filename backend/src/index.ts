import express from "express"
import { Pool } from 'pg';
import cors from "cors"
const app = express();
const PORT = 8000

app.use(express.json())
app.use(cors())

const pool = new Pool({
    user: "postgres",
    host: "postgres-serv",
    database: "mydb",
    password: "password",
    port: 5432
});
pool.query(`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

app.get("/", async(req: any, res:any)=>{
    const result = await pool.query("SELECT * FROM posts");
    res.json({ posts: result.rows });
})

app.post("/", async  (req: any, res:any)=>{
    const body  = req.body
    console.log(body)
    try{
        await pool.query("INSERT INTO posts (content) VALUES ($1)", [body.content])    
        res.json({body, success:"true"})
    }catch(e){
        res.json({success:"false", e})
    }
})

app.listen(PORT, ()=>{
    console.log("Server is running on "+PORT+"...")
})
