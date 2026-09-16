import axios from"axios";
import React,{useState}from"react";
import{backendUrl}from"../App";
import{toast}from"react-toastify";

const Login=({setToken})=>{
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[loading,setLoading]=useState(false);

  const onSubmitHandler=async(e)=>{
    e.preventDefault();
    if(loading)return;

    setLoading(true);

    try{
      const response=await axios.post(`${backendUrl}/api/admin/admin-login`,{
        email:email.trim(),
        password
      });

      if(response.data.success){
        const user=response.data.user||{};
        const role=user.role||"";
        const branch=user.branch||"";

        setToken(response.data.token);

        localStorage.setItem("token",response.data.token);
        localStorage.setItem("role",role);
        localStorage.setItem("branch",branch);
        localStorage.setItem("adminName",user.name||"");

        if(role==="admin"){
          toast.success("Logged in as Main Admin");
        }else if(role==="manager"){
          toast.success(`Logged in as ${branch} Branch Manager`);
        }else if(role==="staff"){
          toast.success(`Logged in as ${branch} Staff`);
        }else{
          toast.success("Logged in successfully");
        }
      }else{
        toast.error(response.data.message||"Login failed");
      }
    }catch(error){
      console.log("LOGIN ERROR:",error);
      toast.error(error.response?.data?.message||error.message);
    }finally{
      setLoading(false);
    }
  };

  return(
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white shadow-md rounded-lg px-8 py-6 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

        <form onSubmit={onSubmitHandler}>
          <div className="mb-3">
            <p>Email</p>

            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="mb-3">
            <p>Password</p>

            <input
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-black text-white rounded-md disabled:opacity-50"
          >
            {loading?"Logging in...":"Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;