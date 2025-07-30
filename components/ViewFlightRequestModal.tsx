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
import { Pencil, Save, X, Eye, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export type FlightRequest = {
  id: string;
  submitted_by: string;
  submitted_at: string;
  status: string;
  search_query: any;
  target_booking_class: string;
  traveler_info: any[];
  pnr_number: string | null;
  last_checked_at: string | null;
  flight_number: string | null;
};

interface ViewFlightRequestModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  flightRequest: FlightRequest | null;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onUpdateTraveler: (id: string, travelerInfo: any[]) => Promise<void>;
  onUpdateSearchQuery: (id: string, searchQuery: any) => Promise<void>;
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
}: ViewFlightRequestModalProps) {
  const [editTravelerIdx, setEditTravelerIdx] = useState<number | null>(null);
  const [travelerDraft, setTravelerDraft] = useState<any>(null);
  const [travelerInfo, setTravelerInfo] = useState<any[]>([]);
  const [showSearchJson, setShowSearchJson] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [editSearch, setEditSearch] = useState(false);
  const [searchDraft, setSearchDraft] = useState<any>({});
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (flightRequest) {
      setTravelerInfo(flightRequest.traveler_info ?? []);
      setSearchDraft(flightRequest.search_query ?? {});
      setStatus(flightRequest.status ?? "");
    }
  }, [flightRequest]);

  if (!flightRequest) return null;

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleString() : "—");
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
      setStatusMenuOpen(false);
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

  const handleSearchChange = (key: string, value: any) => {
    setSearchDraft((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSearch = async () => {
    try {
      setSearchLoading(true);
      await onUpdateSearchQuery(flightRequest.id, searchDraft);
      toast.success("Search query updated successfully");
      setEditSearch(false);
    } catch (error) {
      toast.error("Failed to update search query");
      setSearchDraft(flightRequest.search_query ?? {}); // Revert on error
    } finally {
      setSearchLoading(false);
    }
  };

  const ticketBg = "bg-gradient-to-br from-indigo-100 via-white to-blue-100";
  const ticketShadow = "shadow";
  const ticketBorder = "border border-indigo-200";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`w-full max-w-[1200px] rounded-3xl ${ticketBg} ${ticketShadow} ${ticketBorder} px-0 py-0 font-sans`}>
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
            <span className="inline-block w-8 h-8 bg-white rounded-full flex items-center justify-center shadow mr-2">
              <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#6366f1"/><path d="M4 8h10M9 3v12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            Flight Request Ticket
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close" className="hover:bg-indigo-700 hover:text-white">
              <X className="w-6 h-6" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="absolute left-0 top-0 h-full w-6 border-l-4 border-dashed border-indigo-200 rounded-l-3xl pointer-events-none" />
        <div className="absolute right-0 top-0 h-full w-6 border-r-4 border-dashed border-indigo-200 rounded-r-3xl pointer-events-none" />

        <section className="px-10 py-10 flex flex-col gap-10 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6 font-medium">
            <div>
              <dt className="text-sm text-indigo-700 mb-1">Booking Class</dt>
              <dd className="text-lg font-semibold">{flightRequest.target_booking_class}</dd>
            </div>
            <div>
              <dt className="text-sm text-indigo-700 mb-1">Flight Number</dt>
              <dd className="text-lg font-semibold">{flightRequest.flight_number ?? <span className="text-gray-400">—</span>}</dd>
            </div>
            <div>
              <dt className="text-sm text-indigo-700 mb-1">PNR</dt>
              <dd className="text-lg font-semibold">{flightRequest.pnr_number ?? <span className="text-gray-400">—</span>}</dd>
            </div>
            <div>
              <dt className="text-sm text-indigo-700 mb-1">Status</dt>
              <dd>
                <DropdownMenu open={statusMenuOpen} onOpenChange={setStatusMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={`
                        flex items-center gap-2 px-5 py-2 rounded-full font-bold border-2
                        ${currentStatusObj?.color ?? 'bg-gray-500'}
                        text-white
                        transition
                        ${statusLoading ? "opacity-60 cursor-not-allowed" : "hover:scale-105 hover:shadow-lg"}
                      `}
                      aria-label="Update Status"
                      disabled={statusLoading}
                      onClick={() => !statusLoading && setStatusMenuOpen(!statusMenuOpen)}
                    >
                      <span className={`inline-block w-3 h-3 rounded-full ${currentStatusObj?.color ?? 'bg-gray-500'}`}></span>
                      <span className="ml-2">{currentStatusObj?.label ?? status}</span>
                      <ChevronDown className="w-4 h-4 ml-2 opacity-80" />
                      {statusLoading && (
                        <span className="ml-2 animate-spin">
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                          </svg>
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="z-50">
                    {STATUS_OPTIONS.map(opt => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => !statusLoading && handleStatusUpdate(opt.value)}
                        className={`
                          flex items-center gap-2 px-4 py-3 rounded-xl cursor-pointer font-semibold text-base
                          ${opt.value === status ? "bg-indigo-100" : ""}
                          hover:bg-indigo-700 hover:text-white
                        `}
                        aria-selected={opt.value === status}
                        disabled={statusLoading}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full ${opt.color}`}></span>
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-indigo-700 mb-1">Submitted By</dt>
              <dd className="text-base">{flightRequest.submitted_by}</dd>
            </div>
            <div>
              <dt className="text-sm text-indigo-700 mb-1">Submitted At</dt>
              <dd className="text-base">{fmtDate(flightRequest.submitted_at)}</dd>
            </div>
            <div>
              <dt className="text-sm text-indigo-700 mb-1">Last Checked</dt>
              <dd className="text-base">{fmtDate(flightRequest.last_checked_at)}</dd>
            </div>
          </dl>

          <div className="flex items-center justify-center my-2">
            <svg width="170" height="34" viewBox="0 0 170 34" aria-label="Barcode">
              {[2,10,15,22,25,34,39,45,49,57,61,67,70,79,83,89,93,101,104,110,113].map((x,i) => (
                <rect key={i} x={x} y="4" width={i%2===0?4:2} height="26" rx="1" className="fill-indigo-500 opacity-80" />
              ))}
            </svg>
          </div>

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
                        <Button size="sm" variant="success" onClick={() => handleSaveTraveler(i)}>
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

          <section className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-indigo-700">Search Query</h3>
              <Button
                variant={showSearchJson ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowSearchJson((v) => !v)}
              >
                <Eye className="w-4 h-4 mr-1" />
                {showSearchJson ? "Hide JSON" : "Show JSON"}
              </Button>
            </div>
            {!editSearch ? (
              <>
                <SearchQuerySummary searchQuery={searchDraft} />
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => setEditSearch(true)}>
                  <Pencil className="w-4 h-4 mr-1" /> Edit Search Query
                </Button>
              </>
            ) : (
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="font-semibold text-xs">Currency</label>
                    <input
                      type="text"
                      className="rounded p-1 bg-indigo-50 w-full border border-indigo-200"
                      value={searchDraft.currencyCode ?? ""}
                      onChange={e => handleSearchChange("currencyCode", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-xs">Max Offers</label>
                    <input
                      type="number"
                      className="rounded p-1 bg-indigo-50 w-full border border-indigo-200"
                      value={searchDraft.searchCriteria?.maxFlightOffers ?? ""}
                      onChange={e =>
                        setSearchDraft({
                          ...searchDraft,
                          searchCriteria: {
                            ...searchDraft.searchCriteria,
                            maxFlightOffers: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="success" disabled={searchLoading} onClick={handleSaveSearch}>
                    <Save className="w-4 h-4 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setEditSearch(false)}>
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