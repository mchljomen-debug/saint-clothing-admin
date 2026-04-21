import React, { useEffect, useState } from 'react';
import { assets } from '../assets/assets';
import axios from 'axios';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';

const Add = ({ token }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image3, setImage3] = useState(null);
  const [image4, setImage4] = useState(null);
  const [oldImages, setOldImages] = useState([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Alpine'); 
  const [subCategory, setSubCategory] = useState('T-Shirt');
  const [bestseller, setBestseller] = useState(false);
  const [newArrival, setNewArrival] = useState(false);
  const [sizes, setSizes] = useState([]);
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/product/single/${id}`);
      if (res.data.success) {
        const p = res.data.product;
        setName(p.name);
        setDescription(p.description);
        setPrice(p.price);
        setCategory(p.category);
        setSubCategory(p.subCategory);
        setBestseller(p.bestseller);
        setNewArrival(p.newArrival);
        setSizes(p.sizes);
        setOldImages(p.images || []);
      }
    } catch (err) {
      toast.error('Failed to load product');
    }
  };

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Admin not logged in!');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', category);
      formData.append('subCategory', subCategory);
      if (bestseller) formData.append('bestseller', bestseller);
      if (newArrival) formData.append('newArrival', newArrival);
      formData.append('sizes', JSON.stringify(sizes));

      if (image1) formData.append('image1', image1);
      if (image2) formData.append('image2', image2);
      if (image3) formData.append('image3', image3);
      if (image4) formData.append('image4', image4);

      let response;
      if (id) {
        response = await axios.put(`${backendUrl}/api/product/update/${id}`, formData, axiosConfig);
      } else {
        response = await axios.post(`${backendUrl}/api/product/add`, formData, axiosConfig);
      }

      if (response.data.success) {
        toast.success(response.data.message);
        navigate('/admin/list');
      } else toast.error(response.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  return (
    <form onSubmit={onSubmitHandler} className="max-w-4xl p-6 bg-white border border-gray-100 shadow-sm font-['Montserrat']">
      <div className="mb-8">
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-[#0A0D17]">
          {id ? 'Modify' : 'Initialize'} <span className="text-[#ED3500]">Product Unit</span>
        </h2>
        <div className="h-1 w-16 bg-[#ED3500] mt-1"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Upload Telemetry Images</p>
            <div className="flex gap-3">
              {[image1, image2, image3, image4].map((img, i) => {
                const hasImage = img || oldImages[i];
                return (
                  <label key={i} className="cursor-pointer group relative">
                    <img
                      className={`w-20 h-24 border-2 border-dashed border-gray-200 group-hover:border-[#1055C9] transition-all ${hasImage ? 'object-cover' : 'object-contain p-4 opacity-50'}`}
                      src={img ? URL.createObjectURL(img) : oldImages[i] ? `${backendUrl}/uploads/${oldImages[i]}` : assets.upload_area}
                      alt=""
                    />
                    <input type="file" hidden onChange={(e) => {
                      const file = e.target.files[0];
                      if (i === 0) setImage1(file);
                      if (i === 1) setImage2(file);
                      if (i === 2) setImage3(file);
                      if (i === 3) setImage4(file);
                    }} />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Unit Name</p>
              <input 
                className="w-full px-4 py-2 border-2 border-gray-100 focus:border-[#1055C9] outline-none font-bold italic uppercase transition-all"
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ex: Red Bull Racing Jersey" 
                required 
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Description</p>
              <textarea 
                className="w-full px-4 py-2 border-2 border-gray-100 focus:border-[#1055C9] outline-none h-24 transition-all"
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Technical specifications..." 
                required 
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Category / Team</p>
              <select className="w-full p-2 bg-gray-50 border-2 border-gray-100 font-bold uppercase italic outline-none cursor-pointer text-[12px]" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Alpine">Alpine</option>
                <option value="Mclaren">Mclaren</option>
                <option value="RedBull Racing">RedBull Racing</option>
                <option value="Viva Cash App RB">Visa Cash App RB</option>
                <option value="Williams">Williams</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Sub Category</p>
              <select className="w-full p-2 bg-gray-50 border-2 border-gray-100 font-bold uppercase italic outline-none cursor-pointer text-[12px]" value={subCategory} onChange={e => setSubCategory(e.target.value)}>
                <option value="Tshirt">Tshirt</option>
                <option value="Long sleeve jersey">Long sleeve jersey</option>
                <option value="Long sleeve jersey">Polo Shirt</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Price Unit</p>
            <input 
              className="w-full max-w-[150px] px-4 py-2 border-2 border-gray-100 focus:border-[#1055C9] font-black text-lg outline-none transition-all"
              type="number" 
              value={price} 
              onChange={e => setPrice(e.target.value)} 
              placeholder="0.00" 
              required 
            />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Configuration Sizes</p>
            <div className="flex gap-2">
              {['S','M','L','XL','XXL'].map(size => (
                <span 
                  key={size} 
                  onClick={() => setSizes(prev => prev.includes(size) ? prev.filter(s => s!==size) : [...prev, size])} 
                  className={`px-4 py-2 cursor-pointer font-black text-xs transition-all border-2 skew-x-[-10deg] ${sizes.includes(size) ? 'bg-[#1055C9] text-white border-[#1055C9]' : 'bg-white text-gray-400 border-gray-100 hover:border-[#ED3500]'}`}
                >
                  {size}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                className="w-4 h-4 accent-[#ED3500]" 
                checked={bestseller} 
                onChange={() => setBestseller(!bestseller)} 
              /> 
              <span className="text-xs font-bold uppercase italic text-gray-600 group-hover:text-[#ED3500]">Mark as Bestseller</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                className="w-4 h-4 accent-[#1055C9]" 
                checked={newArrival} 
                onChange={() => setNewArrival(!newArrival)} 
              /> 
              <span className="text-xs font-bold uppercase italic text-gray-600 group-hover:text-[#1055C9]">Mark as New Arrival</span>
            </label>
          </div>
        </div>
      </div>

      <button className="mt-10 w-full md:w-56 py-4 bg-[#0A0D17] hover:bg-[#ED3500] text-white font-black italic uppercase text-xs tracking-[0.3em] skew-x-[-12deg] transition-all shadow-lg active:scale-95">
        {id ? 'Update Configuration' : 'Confirm Launch'}
      </button>
    </form>
  );
};

export default Add;