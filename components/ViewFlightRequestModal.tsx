"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X, Eye, ChevronDown, PlusCircle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export type BookingPreference = {
  id: number;
  bookingClass: string;
  flightNumber: string;
  carrierCode: string;
};
export type FlightRequest = {
  id: string;
  submitted_by: string;
  submitted_at: string;
  status: string;
  search_query: any;
  traveler_info: any[];
  pnr_number: string | null;
  last_checked_at: string | null;
  booking_preferences: BookingPreference[];
  matched_preference?: BookingPreference | null;
};

interface ViewFlightRequestModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  flightRequest: FlightRequest | null;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onUpdateTraveler: (id: string, travelerInfo: any[]) => Promise<void>;
  onUpdateSearchQuery: (id: string, searchQuery: any) => Promise<void>;
  onUpdateBookingPreferences: (
    id: string,
    bookingPreferences: BookingPreference[]
  ) => Promise<FlightRequest | void>;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-indigo-600" },
  { value: "held", label: "Held", color: "bg-amber-500" },
  { value: "queued", label: "Queued", color: "bg-purple-500" },
  { value: "success", label: "Success", color: "bg-green-600" },
  { value: "error", label: "Error", color: "bg-red-600" },
];

export default function ViewFlightRequestModal({
  open,
  onOpenChange,
  flightRequest,
  onUpdateStatus,
  onUpdateTraveler,
  onUpdateSearchQuery,
  onUpdateBookingPreferences,
}: ViewFlightRequestModalProps) {
  const [editTravelerIdx, setEditTravelerIdx] = useState<number | null>(null);
  const [travelerDraft, setTravelerDraft] = useState<any>(null);
  const [travelerInfo, setTravelerInfo] = useState<any[]>([]);
  const [showSearchJson, setShowSearchJson] = useState(false);
  const [editJson, setEditJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [status, setStatus] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [searchDraft, setSearchDraft] = useState<any>({});
  const [searchLoading, setSearchLoading] = useState(false);

  // Booking preferences edit state
  const [editBooking, setEditBooking] = useState(false);
  const [bookingDraft, setBookingDraft] = useState<BookingPreference[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  // Local state for real-time update after save
  const [currentBookingPrefs, setCurrentBookingPrefs] = useState<BookingPreference[]>([]);

  useEffect(() => {
    if (flightRequest) {
      setTravelerInfo(flightRequest.traveler_info ?? []);
      setSearchDraft(flightRequest.search_query ?? {});
      setJsonDraft(JSON.stringify(flightRequest.search_query ?? {}, null, 2));
      setStatus(flightRequest.status ?? "");
      setBookingDraft(flightRequest.booking_preferences ?? []);
      setCurrentBookingPrefs(flightRequest.booking_preferences ?? []);
    }
  }, [flightRequest]);

  if (!flightRequest) return null;

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleString() : "—";
  const currentStatusObj =
    STATUS_OPTIONS.find((opt) => opt.value === status) ||
    STATUS_OPTIONS.find((opt) => opt.value === flightRequest.status);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setStatusLoading(true);
      setStatus(newStatus);
      await onUpdateStatus(flightRequest.id, newStatus);
      toast.success("Status updated successfully");
    } catch (error) {
      toast.error("Failed to update status");
      setStatus(flightRequest.status); // Revert on error
    } finally {
      setStatusLoading(false);
    }
  };

  const handleEditTraveler = (traveler: any, idx: number) => {
    setEditTravelerIdx(idx);
    setTravelerDraft({ ...traveler });
  };

  const handleSaveTraveler = async (idx: number) => {
    try {
      if (travelerDraft) {
        const updated = travelerInfo.map((t, i) => (i === idx ? travelerDraft : t));
        setTravelerInfo(updated);
        await onUpdateTraveler(flightRequest.id, updated);
        toast.success("Traveler info updated successfully");
      }
      setEditTravelerIdx(null);
      setTravelerDraft(null);
    } catch (error) {
      toast.error("Failed to update traveler info");
      setTravelerInfo(flightRequest.traveler_info ?? []); // Revert on error
    }
  };

  const handleCancelTraveler = () => {
    setEditTravelerIdx(null);
    setTravelerDraft(null);
  };

  // JSON edit logic for search query
  const handleEditJson = () => {
    setEditJson(true);
    setJsonDraft(JSON.stringify(searchDraft, null, 2));
  };
  const handleCancelJson = () => {
    setEditJson(false);
    setJsonDraft(JSON.stringify(searchDraft, null, 2));
  };
  const handleSaveJson = async () => {
    try {
      const parsed = JSON.parse(jsonDraft);
      setSearchLoading(true);
      await onUpdateSearchQuery(flightRequest!.id, parsed);
      setSearchDraft(parsed);
      toast.success("Search query updated successfully");
      setEditJson(false);
    } catch (err) {
      toast.error("Invalid JSON or failed to update");
    } finally {
      setSearchLoading(false);
    }
  };

  // Booking preferences logic
  const handleEditBookingPrefs = () => {
    setEditBooking(true);
    setBookingDraft(currentBookingPrefs ?? []);
  };
  const handleCancelBookingPrefs = () => {
    setEditBooking(false);
    setBookingDraft(currentBookingPrefs ?? []);
  };
  const handleSaveBookingPrefs = async () => {
    try {
      setBookingLoading(true);
      const isValid = bookingDraft.every(
        (b) =>
          typeof b.id !== "undefined" &&
          typeof b.carrierCode === "string" &&
          typeof b.bookingClass === "string" &&
          typeof b.flightNumber === "string"
      );
      if (!isValid) throw new Error("Each booking must have id, carrierCode, bookingClass, flightNumber");

      const result = await onUpdateBookingPreferences(flightRequest.id, bookingDraft);
      if (result && result.booking_preferences) {
        setCurrentBookingPrefs(result.booking_preferences);
      } else {
        setCurrentBookingPrefs(bookingDraft);
      }
      toast.success("Booking preferences updated successfully");
      setEditBooking(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update booking preferences");
      setBookingDraft(currentBookingPrefs ?? []);
    } finally {
      setBookingLoading(false);
    }
  };
  const handleBookingFieldChange = (idx: number, field: keyof BookingPreference, value: string) => {
    setBookingDraft((prev) =>
      prev.map((b, i) =>
        i === idx ? { ...b, [field]: value } : b
      )
    );
  };
  const handleRemoveBookingRow = (idx: number) => {
    setBookingDraft((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleAddBookingRow = () => {
    setBookingDraft((prev) => [
      ...prev,
      {
        id: Date.now(), // always unique
        bookingClass: "",
        flightNumber: "",
        carrierCode: "",
      },
    ]);
  };

  const ticketBg = "bg-gradient-to-br from-indigo-100 via-white to-blue-100";
  const ticketShadow = "shadow";
  const ticketBorder = "border border-indigo-200";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`
          w-full max-w-[1200px]
          rounded-3xl
          ${ticketBg} ${ticketShadow} ${ticketBorder}
          px-0 py-0 font-sans
          max-h-[calc(100vh-8rem)]
          my-auto
          overflow-y-auto
        `}
        style={{ boxSizing: "border-box" }}
      >
        <DialogHeader
          className={`
            flex items-center justify-between px-10 py-7
            bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-600
            rounded-t-3xl
            text-white
            font-semibold
            border-b border-dashed border-indigo-300
            shadow
          `}
        >
          <DialogTitle className="text-2xl tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow mr-2">
              <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#6366f1"/><path d="M4 8h10M9 3v12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            Flight Request Ticket
          </DialogTitle>
        </DialogHeader>

        {/* Ticket Meta Info - improved UI */}
        <div className="px-10 pt-6 pb-2 mb-4">
          <div className="flex flex-wrap gap-4 items-center bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm p-4">
            {/* Status */}
            <div className="flex flex-col items-start min-w-[130px]">
              <span className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full mr-1 ${currentStatusObj?.color}`}></span>
                Status
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`capitalize px-0 font-semibold text-indigo-900 hover:bg-indigo-100`}
                    disabled={statusLoading}
                  >
                    {currentStatusObj?.label ?? status}
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => handleStatusUpdate(opt.value)}
                      className="flex items-center gap-2"
                    >
                      <span className={`inline-block w-2 h-2 rounded-full ${opt.color}`}></span>
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Submitted By */}
            <div className="flex flex-col items-start min-w-[180px] max-w-[220px]">
              <span className="text-xs text-gray-500 font-medium">Submitted By</span>
              <span className="font-medium text-indigo-800 truncate">{flightRequest.submitted_by}</span>
            </div>
            {/* Submitted At */}
            <div className="flex flex-col items-start min-w-[170px]">
              <span className="text-xs text-gray-500 font-medium">Submitted At</span>
              <span className="text-gray-800">{fmtDate(flightRequest.submitted_at)}</span>
            </div>
            {/* Last Checked */}
            <div className="flex flex-col items-start min-w-[170px]">
              <span className="text-xs text-gray-500 font-medium">Last Checked</span>
              <span className="text-gray-800">{fmtDate(flightRequest.last_checked_at)}</span>
            </div>
            {/* PNR */}
            <div className="flex flex-col items-start min-w-[120px]">
              <span className="text-xs text-gray-500 font-medium">PNR Number</span>
              <span className="font-mono text-indigo-700">{flightRequest.pnr_number || <span className="text-gray-400">—</span>}</span>
            </div>
          </div>
        </div>

        {/* Main Content - NO inner scroll here! */}
        <section className="px-10 py-10 flex flex-col gap-10">
          {/* Booking Preferences Table */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-indigo-700">Booking Preferences</h3>
              {!editBooking && (
                <Button size="sm" variant="ghost" onClick={handleEditBookingPrefs}>
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </div>
            {!editBooking ? (
              <>
                {currentBookingPrefs && currentBookingPrefs.length > 0 ? (
                  <table className="w-full text-sm border border-indigo-100 bg-white rounded-xl shadow mb-2">
                    <thead>
                      <tr className="bg-indigo-50 text-indigo-800">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Booking Class</th>
                        <th className="px-3 py-2">Flight Number</th>
                        <th className="px-3 py-2">Carrier Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBookingPrefs.map((pref, idx) => {
                        const isMatched =
                          flightRequest.matched_preference &&
                          pref.bookingClass === flightRequest.matched_preference.bookingClass &&
                          pref.flightNumber === flightRequest.matched_preference.flightNumber &&
                          pref.carrierCode === flightRequest.matched_preference.carrierCode;
                        return (
                          <tr
                            key={pref.id}
                            className={isMatched ? "bg-green-100 font-bold" : ""}
                          >
                            <td className="px-3 py-2">{idx + 1}</td>
                            <td className="px-3 py-2">{pref.bookingClass}</td>
                            <td className="px-3 py-2">{pref.flightNumber}</td>
                            <td className="px-3 py-2">{pref.carrierCode}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-gray-400">No booking preferences provided.</div>
                )}
                {flightRequest.matched_preference && (
                  <div className="mt-1 text-green-800 bg-green-50 p-2 rounded shadow text-xs">
                    <b>Matched Preference:</b> <span>
                      {flightRequest.matched_preference.bookingClass} / {flightRequest.matched_preference.flightNumber} / {flightRequest.matched_preference.carrierCode}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <table className="w-full text-sm border border-indigo-100 bg-white rounded-xl shadow mb-2">
                  <thead>
                    <tr className="bg-indigo-50 text-indigo-800">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Booking Class</th>
                      <th className="px-3 py-2">Flight Number</th>
                      <th className="px-3 py-2">Carrier Code</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingDraft.map((pref, idx) => (
                      <tr key={pref.id}>
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            className="rounded p-1 bg-indigo-50 w-full border border-indigo-200"
                            value={pref.bookingClass}
                            onChange={e => handleBookingFieldChange(idx, "bookingClass", e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            className="rounded p-1 bg-indigo-50 w-full border border-indigo-200"
                            value={pref.flightNumber}
                            onChange={e => handleBookingFieldChange(idx, "flightNumber", e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            className="rounded p-1 bg-indigo-50 w-full border border-indigo-200"
                            value={pref.carrierCode}
                            onChange={e => handleBookingFieldChange(idx, "carrierCode", e.target.value)}
                          />
                        </td>
                        <td>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleRemoveBookingRow(idx)}
                            className="ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-2 mb-2">
                  <Button size="sm" variant="outline" onClick={handleAddBookingRow}>
                    <PlusCircle className="w-4 h-4 mr-1" /> Add Row
                  </Button>
                  <Button size="sm" variant="default" onClick={handleSaveBookingPrefs} disabled={bookingLoading}>
                    <Save className="w-4 h-4 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleCancelBookingPrefs} disabled={bookingLoading}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
              </>
            )}
          </section>

          {/* Traveler Info Section (View + Edit) */}
          <section>
            <h3 className="text-base font-semibold mb-4 text-indigo-700">Traveler Info</h3>
            <div className="flex flex-col gap-4">
              {travelerInfo.map((t, i) => (
                <div key={i} className="rounded-xl border border-indigo-100 px-5 py-4 bg-white/60 shadow">
                  {editTravelerIdx === i ? (
                    <div>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <label className="font-semibold text-xs">First Name</label>
                          <input
                            type="text"
                            className="rounded p-1 bg-indigo-50 w-full border border-indigo-200"
                            value={travelerDraft?.name?.firstName ?? ""}
                            onChange={e => setTravelerDraft({
                              ...travelerDraft,
                              name: { ...travelerDraft.name, firstName: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-xs">Last Name</label>
                          <input
                            type="text"
                            className="rounded p-1 bg-indigo-50 w-full border border-indigo-200"
                            value={travelerDraft?.name?.lastName ?? ""}
                            onChange={e => setTravelerDraft({
                              ...travelerDraft,
                              name: { ...travelerDraft.name, lastName: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-xs">Gender</label>
                          <input
                            type="text"
                            className="rounded p-1 bg-indigo-50 w-full border border-indigo-200"
                            value={travelerDraft?.gender ?? ""}
                            onChange={e => setTravelerDraft({ ...travelerDraft, gender: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-xs">Date of Birth</label>
                          <input
                            type="date"
                            className="rounded p-1 bg-indigo-50 w-full border border-indigo-200"
                            value={travelerDraft?.dateOfBirth ?? ""}
                            onChange={e => setTravelerDraft({ ...travelerDraft, dateOfBirth: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="font-semibold text-xs">Email</label>
                        <input
                          type="email"
                          className="rounded p-1 bg-indigo-50 w-full border border-indigo-200"
                          value={travelerDraft?.contact?.emailAddress ?? ""}
                          onChange={e => setTravelerDraft({
                            ...travelerDraft,
                            contact: { ...travelerDraft.contact, emailAddress: e.target.value }
                          })}
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="default" onClick={() => handleSaveTraveler(i)}>
                          <Save className="w-4 h-4 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleCancelTraveler}>
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-base text-indigo-700">
                          {t?.name?.firstName} {t?.name?.lastName}
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => handleEditTraveler(t, i)}>
                          <Pencil className="w-4 h-4" /> Edit
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><b>Gender:</b> {t?.gender}</div>
                        <div><b>DOB:</b> {t?.dateOfBirth}</div>
                        <div><b>Email:</b> {t?.contact?.emailAddress}</div>
                        <div><b>Phone:</b> {t?.contact?.phones?.[0]?.number}</div>
                      </div>
                      <div className="mt-2 text-sm">
                        <b>Passport:</b> {t?.documents?.[0]?.number} <span className="text-xs">Exp: {t?.documents?.[0]?.expiryDate}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Search Query Section (Show/JSON edit only) */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-indigo-700">Search Query</h3>
              <Button
                variant={showSearchJson ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  setShowSearchJson((v) => !v);
                  setEditJson(false); // Always show as read-only first
                }}
              >
                <Eye className="w-4 h-4 mr-1" />
                {showSearchJson ? "Hide JSON" : "Show JSON"}
              </Button>
            </div>
            {!showSearchJson ? (
              <SearchQuerySummary searchQuery={searchDraft} />
            ) : !editJson ? (
              <div className="mt-2">
                <textarea
                  className="w-full min-h-[200px] bg-indigo-100 rounded p-2 text-xs font-mono border border-indigo-200"
                  value={jsonDraft}
                  readOnly
                />
                <Button size="sm" variant="ghost" className="mt-2" onClick={handleEditJson}>
                  <Pencil className="w-4 h-4 mr-1" /> Edit JSON
                </Button>
              </div>
            ) : (
              <div className="mt-2">
                <textarea
                  className="w-full min-h-[200px] bg-indigo-100 rounded p-2 text-xs font-mono border border-indigo-200"
                  value={jsonDraft}
                  onChange={e => setJsonDraft(e.target.value)}
                  disabled={searchLoading}
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="default" disabled={searchLoading} onClick={handleSaveJson}>
                    <Save className="w-4 h-4 mr-1" /> Save JSON
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleCancelJson}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            )}
          </section>
        </section>

        <DialogFooter
          className={`
            flex items-center justify-between px-10 py-7
            bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-600
            rounded-b-3xl
            text-white
            border-t border-dashed border-indigo-300
          `}
        >
          <span className="text-xs font-bold tracking-wide select-all">
            Ticket ID: {flightRequest.id}
          </span>
          <DialogClose asChild>
            <Button variant="default" className="ml-4 px-6 py-2 text-base rounded-full bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SearchQuerySummary({ searchQuery }: { searchQuery: any }) {
  const od = searchQuery?.originDestinations?.[0] || {};
  const cabin = searchQuery?.searchCriteria?.flightFilters?.cabinRestrictions?.[0]?.cabin;
  const carrier = searchQuery?.searchCriteria?.flightFilters?.carrierRestrictions?.includedCarrierCodes?.join(", ");
  return (
    <div className="bg-indigo-50 rounded-xl p-4 text-xs border border-indigo-100">
      <div className="mb-1"><b>Source:</b> {searchQuery?.sources?.join(", ")}</div>
      <div className="mb-1"><b>Currency:</b> {searchQuery?.currencyCode}</div>
      <div className="mb-1"><b>Cabin:</b> {cabin}</div>
      <div className="mb-1"><b>Carrier:</b> {carrier}</div>
      <div className="mb-1"><b>Non Stop:</b> {searchQuery?.searchCriteria?.nonStop ? "Yes" : "No"}</div>
      <div className="mb-1"><b>Max Offers:</b> {searchQuery?.searchCriteria?.maxFlightOffers}</div>
      <div className="mb-1"><b>Origin:</b> {od?.originLocationCode} <b>→</b> {od?.destinationLocationCode} <b>Date:</b> {od?.departureDateTimeRange?.date}</div>
    </div>
  );
}