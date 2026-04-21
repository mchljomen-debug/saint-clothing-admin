import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { backendUrl, currency } from '../App';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Pagination } from 'antd';

const List = ({ token }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();


  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); 

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/product/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setList(res.data.products.reverse());
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeProduct = async (id) => {
    if (!window.confirm("Move this unit to trash?")) return;
    try {
      const res = await axios.post(
        `${backendUrl}/api/product/remove`,
        { id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Unit moved to trash");
        fetchList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const editProduct = (item) => navigate(`/admin/add/${item._id}`);

  useEffect(() => {
    if (token) fetchList();
  }, [token]);

  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentItems = list.slice(indexOfFirstItem, indexOfLastItem);

  const onPageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ED3500]"></div>
    </div>
  );

  return (
    <div className="p-2 font-['Montserrat']">
      <div className="mb-6">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#0A0D17]">
          Inventory <span className="text-[#ED3500]">Control</span>
        </h2>
        <div className="h-1 w-20 bg-[#ED3500] mt-1"></div>
      </div>

      <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-[0.5fr_2fr_1fr_1fr_1fr] bg-[#0A0D17] text-white p-4 font-black italic uppercase text-[11px] tracking-widest">
          <span>Asset</span>
          <span>Technical Name</span>
          <span>Category</span>
          <span>Price Unit</span>
          <span className="text-center">Operations</span>
        </div>

        <div className="flex flex-col">
          {currentItems.map((item) => (
            <div
              key={item._id}
              className="grid grid-cols-1 md:grid-cols-[0.5fr_2fr_1fr_1fr_1fr] items-center border-b border-gray-50 p-4 hover:bg-blue-50/30 transition-colors group"
            >
              <div className="mb-2 md:mb-0">
                <img
                  src={item.images?.[0] ? `${backendUrl}/uploads/${item.images[0]}` : 'fallback-image.jpg'}
                  alt={item.name}
                  className="w-14 h-16 object-cover border border-gray-200 group-hover:border-[#1055C9] transition-all"
                />
              </div>

              <p className="font-bold text-[#0A0D17] uppercase italic text-sm truncate pr-4">
                {item.name}
              </p>

              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {item.category} <span className="text-[#ED3500]">/</span> {item.subCategory}
              </p>

              <p className="font-black text-[#1055C9] text-lg">
                {currency}{item.price}
              </p>

              <div className="flex gap-2 justify-center mt-4 md:mt-0">
                <button 
                  onClick={() => editProduct(item)} 
                  className="bg-[#1055C9] text-white px-4 py-1.5 text-[10px] font-black italic uppercase skew-x-[-10deg] hover:bg-[#0A0D17] transition-all"
                >
                  Edit
                </button>
                <button 
                  onClick={() => removeProduct(item._id)} 
                  className="border-2 border-[#ED3500] text-[#ED3500] px-3 py-1 text-[10px] font-black italic uppercase skew-x-[-10deg] hover:bg-[#ED3500] hover:text-white transition-all"
                >
                  Trash
                </button>
              </div>
            </div>
          ))}
        </div>

        {list.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xs font-black uppercase text-gray-300 italic tracking-[0.3em]">
              No Assets Detected In Paddock
            </p>
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="flex justify-center items-center py-8">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={list.length}
            onChange={onPageChange}
            showQuickJumper
            showSizeChanger={false}
            className="font-black italic uppercase"
          />
        </div>
      )}
    </div>
  );
};

export default List;