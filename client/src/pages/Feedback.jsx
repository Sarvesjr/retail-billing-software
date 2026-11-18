import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import {
  MessageSquareHeart,
  Star,
  Search,
  Filter,
  Calendar,
  User,
  Phone,
  Receipt,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  RefreshCw
} from 'lucide-react';

export function Feedback() {
  const { t, lang } = useI18n();
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    avgRating: 0,
    stars5: 0,
    stars4: 0,
    stars3: 0,
    stars2: 0,
    stars1: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Manual Direct Feedback Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    customer_name: '',
    customer_phone: '',
    invoice_no: '',
    rating: 5,
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [fRes, sRes] = await Promise.all([
        api.getFeedbacks({ search, minRating }),
        api.getFeedbackStats()
      ]);
      setFeedbacks(fRes.data || []);
      setStats(sRes.data || stats);
    } catch (err) {
      setErrorMsg('Failed to load customer feedbacks: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [minRating]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenAddModal = () => {
    setModalForm({
      customer_name: '',
      customer_phone: '',
      invoice_no: '',
      rating: 5,
      comment: ''
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createFeedback(modalForm);
      setSuccessMsg('Customer feedback recorded successfully!');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg('Failed to record feedback: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating
                ? 'fill-amber-400 text-amber-500'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <MessageSquareHeart className="w-5 h-5 text-rose-600" />
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">
              {lang === 'ta' ? 'வாடிக்கையாளர் கருத்துக்கள் (Customer Feedbacks)' : 'Customer Feedbacks & Ratings'}
            </h2>
            <p className="text-[11px] text-gray-500">
              {lang === 'ta'
                ? 'பில்லிங் முடிவில் வாடிக்கையாளர்கள் அளித்த கருத்துக்கள் மற்றும் மதிப்பீடுகள்'
                : 'View ratings, customer reviews and service satisfaction recorded after billing'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="btn-primary text-xs py-1.5 px-3 bg-rose-600 hover:bg-rose-700 border-rose-700 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ {lang === 'ta' ? 'புதிய கருத்து சேர்க்க' : 'Add Direct Feedback'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="bg-red-50 text-red-800 text-xs px-4 py-2 border-b border-red-200 flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 text-green-800 text-xs px-4 py-2 border-b border-green-200 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* KPI / Stats Overview Row */}
        <div className="grid grid-cols-12 gap-3">
          {/* Average Rating Box */}
          <div className="col-span-4 bg-white border border-gray-300 rounded p-4 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase text-gray-500">
                {lang === 'ta' ? 'சராசரி மதிப்பீடு' : 'Overall Store Rating'}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-gray-900 font-mono">
                  {stats.avgRating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500 font-semibold">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.round(stats.avgRating)
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="text-xs text-gray-600 font-bold ml-1.5">
                  ({stats.totalCount} {lang === 'ta' ? 'மதிப்பீடுகள்' : 'reviews'})
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center shrink-0">
              <ThumbsUp className="w-7 h-7 text-rose-600" />
            </div>
          </div>

          {/* Star Rating Breakdown Distribution */}
          <div className="col-span-8 bg-white border border-gray-300 rounded p-4 shadow-xs flex flex-col justify-between text-xs">
            <div className="text-[11px] font-bold uppercase text-gray-500 mb-2">
              {lang === 'ta' ? 'மதிப்பீட்டு விவரங்கள்' : 'Rating Distribution'}
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[5, 4, 3, 2, 1].map((starNum) => {
                const count = stats[`stars${starNum}`] || 0;
                const pct = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                return (
                  <div key={starNum} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span className="flex items-center gap-0.5 text-gray-700">
                        {starNum} <Star className="w-3 h-3 fill-amber-400 text-amber-500 inline" />
                      </span>
                      <span className="text-gray-600">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-gray-300 rounded p-3 shadow-xs flex items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === 'ta' ? 'வாடிக்கையாளர் பெயர், தொலைபேசி, பில் எண்...' : 'Search by customer, phone, invoice, comment...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-8 w-full text-xs"
              />
            </div>
            <button type="submit" className="btn-secondary text-xs py-1.5 px-3">
              {t('search')}
            </button>
          </form>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-bold">{t('filter')}:</span>
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="form-input text-xs py-1"
            >
              <option value="">All Ratings (அனைத்து மதிப்பீடுகள்)</option>
              <option value="5">5 Stars Only (சிறந்தது)</option>
              <option value="4">4+ Stars & Above</option>
              <option value="3">3+ Stars & Above</option>
              <option value="1">1-2 Stars (Needs Attention)</option>
            </select>
          </div>
        </div>

        {/* Feedback List / Table */}
        <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-300 font-bold text-xs text-gray-800 flex items-center justify-between">
            <span>Customer Reviews & Feedback Stream</span>
            <span className="text-[11px] font-mono text-gray-500">Showing {feedbacks.length} records</span>
          </div>

          {feedbacks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MessageSquareHeart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <div className="font-bold text-gray-600">No customer feedbacks recorded yet</div>
              <div className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Customer feedback submitted at the end of billing will appear here automatically.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {feedbacks.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50/80 transition flex items-start gap-4">
                  {/* Rating Icon Avatar */}
                  <div
                    className={`w-11 h-11 rounded-full flex flex-col items-center justify-center shrink-0 border ${
                      item.rating >= 4
                        ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold'
                        : item.rating === 3
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                        : 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                    }`}
                  >
                    <span className="text-sm font-black font-mono leading-none">{item.rating}★</span>
                  </div>

                  {/* Feedback Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-xs">
                          {item.customer_name || 'Walk-in Customer'}
                        </span>
                        {item.customer_phone && (
                          <span className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {item.customer_phone}
                          </span>
                        )}
                        {item.invoice_no && (
                          <span className="text-[10px] font-mono bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 font-bold flex items-center gap-1">
                            <Receipt className="w-2.5 h-2.5" />
                            {item.invoice_no}
                          </span>
                        )}
                      </div>

                      {/* Date & Time */}
                      <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {new Date(item.created_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </span>
                    </div>

                    {/* Star row */}
                    <div className="mt-1 flex items-center gap-2">
                      {renderStars(item.rating)}
                      <span className="text-[11px] font-bold text-gray-600">
                        {item.rating === 5 ? 'Excellent / அற்புதம்' : item.rating === 4 ? 'Good / நன்று' : item.rating === 3 ? 'Average / சராசரி' : 'Needs Improvement'}
                      </span>
                    </div>

                    {/* Comment */}
                    {item.comment ? (
                      <p className="mt-2 text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded p-2.5 italic">
                        "{item.comment}"
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-gray-400 italic">No additional text comment provided.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual Add Feedback Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-2xl border border-gray-400 max-w-md w-full overflow-hidden">
            <div className="bg-rose-700 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                <MessageSquareHeart className="w-4 h-4 text-white" />
                <span>+ Record Customer Feedback</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-rose-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Customer Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Anitha Raj"
                  value={modalForm.customer_name}
                  onChange={(e) => setModalForm({ ...modalForm, customer_name: e.target.value })}
                  className="form-input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number:</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={modalForm.customer_phone}
                    onChange={(e) => setModalForm({ ...modalForm, customer_phone: e.target.value })}
                    className="form-input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Invoice No (Optional):</label>
                  <input
                    type="text"
                    placeholder="INV-20261118-0001"
                    value={modalForm.invoice_no}
                    onChange={(e) => setModalForm({ ...modalForm, invoice_no: e.target.value })}
                    className="form-input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">Rating (1 to 5 Stars):</label>
                <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded border border-gray-200 justify-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setModalForm({ ...modalForm, rating: s })}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          s <= modalForm.rating
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="font-bold text-sm text-gray-800 ml-2 font-mono">
                    {modalForm.rating} / 5
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Customer Comment:</label>
                <textarea
                  rows="3"
                  placeholder="Customer thoughts, product request, or experience..."
                  value={modalForm.comment}
                  onChange={(e) => setModalForm({ ...modalForm, comment: e.target.value })}
                  className="form-input w-full text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-1.5 px-4 bg-rose-600 hover:bg-rose-700 border-rose-700 font-bold"
                >
                  {submitting ? 'Saving...' : 'Save Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
