import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [todos, setTodos] = useState<any>([])
  const [val, setVal]  = useState("")
  const sendIt = async()=>{
    console.log(val)
    // const res = await fetch("http://localhost:30008/", {
    const res = await fetch("http://a95a9afe600174f9cbff08a255f88827-1102760794.ap-south-1.elb.amazonaws.com", {
      method:"POST",
      headers:{
          "Content-Type": "application/json"
      },
      body:JSON.stringify({
        content:val
      })
    })
    const body = await res.json()
    setTodos([...todos, body])
  }
  useEffect(() => {
    const fetcher = async () => {
      const todos = await fetch("http://localhost:30008/")
      setTodos((await todos.json()).posts)
    }
    fetcher()
  }, [])

  return (
    <>
      <div>
        <h1>UNDELETEABLE - NOTE TAKER</h1>
        <div>
          {/*@ts-ignore*/}
          {todos.length>0 && todos.map((e:any)=>{ return <div>|--- ID: {e.id} ---|--- {e.content} ---|---{ Date(e.created_at).toString().substring(4, 16)} ---|</div>})}
        </div>
        <input value={val} onChange={(e)=>setVal(e.target.value)} type="text" />
        <button onClick={()=> sendIt()}>SEND</button>
      </div>
    </>
  )
}

export default App
