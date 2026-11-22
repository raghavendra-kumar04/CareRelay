import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Printer, X, AlertCircle, Calendar, Pill, FileText, CheckCircle2 } from 'lucide-react';
import { useAppointments } from '../../hooks/useAppointments';
import { usePrescriptions } from '../../hooks/usePrescriptions';
import { useQuery } from '@tanstack/react-query';
import { getFamily, getMembers } from '../../lib/familyApi';
import { usePatientStore } from '../../store/patientStore';
import type { Patient } from '../../types';

interface DoctorVisitSheetModalProps {
  fid: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DoctorVisitSheetModal({ fid, isOpen, onClose }: DoctorVisitSheetModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const familyQuery = useQuery({
    queryKey: ['family', fid],
    queryFn: () => getFamily(fid),
    enabled: Boolean(fid) && isOpen,
  });

  const membersQuery = useQuery({
    queryKey: ['family-members', fid],
    queryFn: () => getMembers(fid),
    enabled: Boolean(fid) && isOpen,
  });

  const appointmentsQuery = useAppointments(fid, { limit: 20 });
  const prescriptionsQuery = usePrescriptions(fid);

  const family = familyQuery.data?.family;
  const members = membersQuery.data?.members ?? [];
  const appointments = appointmentsQuery.data?.appointments ?? [];
  const prescriptions = prescriptionsQuery.data?.prescriptions ?? [];

  const patients: Patient[] = (Array.isArray(family?.patients) && family.patients.length > 0
    ? family.patients
    : [
        {
          _id: family?._id ? `${family._id}-patient-1` : 'patient-1',
          name: family?.careRecipient?.name || 'Venkateswara Rao',
          relationship: family?.careRecipient?.relationship || 'Father',
          age: family?.careRecipient?.age || 72,
          gender: 'Male',
          condition: family?.careRecipient?.condition || 'Cardiology recovery, Type 2 Diabetes, Hypertension',
          location: family?.careRecipient?.location || 'Guntur, Andhra Pradesh',
          primaryLanguage: family?.careRecipient?.primaryLanguage || 'Telugu, English',
          notes: family?.careRecipient?.notes || '',
        },
      ]
  ).map((p, idx) => ({
    ...p,
    _id: p._id ? String(p._id) : `patient-${idx}-${p.name || 'default'}`,
  }));

  const { selectedPatientId } = usePatientStore();
  const [activePatientId, setActivePatientId] = useState<string>(
    selectedPatientId && selectedPatientId !== 'all' ? selectedPatientId : patients[0]?._id
  );

  useEffect(() => {
    if (patients.length > 0) {
      if (selectedPatientId && selectedPatientId !== 'all' && patients.some((p) => p._id === selectedPatientId)) {
        setActivePatientId(selectedPatientId);
      } else if (!activePatientId || !patients.some((p) => p._id === activePatientId)) {
        setActivePatientId(patients[0]._id);
      }
    }
  }, [patients, selectedPatientId]);

  const activePatient = patients.find((p) => p._id === activePatientId) || patients[0];

  if (!isOpen) return null;

  const activePrescriptions = prescriptions.filter((p) => p.status === 'active');
  const upcomingAppointments = appointments.filter((a) => a.status === 'scheduled');
  const pastAppointments = appointments.filter((a) => a.status === 'completed');

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div id="doctor-visit-modal-portal" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm print:static print:p-0">
      {/* Screen Backdrop */}
      <div className="modal-backdrop fixed inset-0 bg-black/60 print:hidden" onClick={onClose} />

      {/* Modal Card */}
      <div className="modal-card relative z-10 w-full max-w-4xl max-h-[90vh] md:max-h-[92vh] flex flex-col rounded-2xl bg-white border border-border shadow-2xl overflow-hidden print:max-h-none print:h-auto print:border-none print:shadow-none print:overflow-visible print:rounded-none">
        
        {/* Modal Controls - Hidden during print */}
        <div className="modal-controls flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-border bg-gray-50/90 px-5 py-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Clinical Doctor Visit One-Pager</h2>
              <p className="text-[11px] sm:text-xs text-gray-500">Official medical summary sheet for doctor visits & hospital consultations</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Patient Switcher for multi-patient families */}
            {patients.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-xs">
                <span className="text-[11px] font-bold text-gray-500">Patient:</span>
                <select
                  value={activePatientId}
                  onChange={(e) => setActivePatientId(e.target.value)}
                  className="text-xs font-semibold text-gray-900 bg-transparent border-none outline-none cursor-pointer pr-1"
                >
                  {patients.map((p, idx) => (
                    <option key={p._id ? String(p._id) : `opt-${idx}`} value={p._id}>
                      {p.name} ({p.relationship || 'Patient'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-dark transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Content - Single Page Layout */}
        <div
          id="doctor-visit-sheet"
          ref={printRef}
          className="sheet-content flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 text-gray-900 bg-white print:p-0 print:overflow-visible print:space-y-3.5 text-xs"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b-2 border-emerald-700/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white font-black text-sm">
                CR
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-gray-900">
                  Care<span className="text-emerald-700">Relay</span>
                  <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    • Clinical Medical Care Sheet
                  </span>
                </h1>
                <p className="text-[11px] text-gray-600">
                  Care Workspace: <strong className="text-gray-900">{family?.name || 'Rao Family Care'}</strong>
                </p>
              </div>
            </div>

            <div className="text-right text-[10px] text-gray-500">
              <p>Generated: <strong className="text-gray-700">{format(new Date(), 'dd MMM yyyy, h:mm a')}</strong></p>
              <p className="mt-0.5">Confidential Patient Coordination Summary</p>
            </div>
          </div>

          {/* Patient Overview & Family Emergency Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-lg border border-gray-300 p-3 bg-gray-50/50 print:bg-transparent">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Care Recipient (Patient) {activePatient?.relationship ? `• ${activePatient.relationship}` : ''}
              </span>
              <h3 className="text-base font-bold text-gray-900 mt-0.5">
                {activePatient?.name} (Age {activePatient?.age || 70})
              </h3>
              <p className="text-[11px] text-gray-600 mt-0.5">
                Location: {activePatient?.location || 'Guntur, Andhra Pradesh'} • Primary Language: {activePatient?.primaryLanguage || 'Telugu, English'}
              </p>
              {activePatient?.condition && (
                <p className="text-[11px] text-emerald-900 mt-1 font-medium bg-emerald-50/60 p-1 rounded border border-emerald-200/60 print:bg-transparent print:border-none print:p-0">
                  Tracked Condition: {activePatient.condition}
                </p>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Family Emergency Contacts</span>
              <div className="mt-1 space-y-0.5 text-[11px]">
                {members.slice(0, 3).map((m) => (
                  <div key={m.membershipId} className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">
                      {m.user?.name} <span className="text-[10px] text-gray-500 font-normal uppercase">({m.role})</span>
                    </span>
                    <span className="text-gray-600">{m.user?.email}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Prescriptions & Medications */}
          <div>
            <div className="flex items-center gap-1.5 border-b border-gray-300 pb-1.5 mb-2">
              <Pill className="h-3.5 w-3.5 text-emerald-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Current Active Medications & Prescriptions
              </h2>
            </div>

            {activePrescriptions.length === 0 ? (
              <p className="text-[11px] text-gray-500 italic py-1">No active prescriptions currently on record.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border border-gray-300 border-collapse">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr className="border-b border-gray-300">
                      <th className="py-1.5 px-2.5 font-bold w-[28%]">Medication Name</th>
                      <th className="py-1.5 px-2.5 font-bold w-[16%]">Dosage</th>
                      <th className="py-1.5 px-2.5 font-bold w-[26%]">Frequency / Directions</th>
                      <th className="py-1.5 px-2.5 font-bold w-[18%]">Prescribed By</th>
                      <th className="py-1.5 px-2.5 font-bold w-[12%] text-right">Refill Schedule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activePrescriptions.map((rx) => (
                      <tr key={rx._id}>
                        <td className="py-1.5 px-2.5 font-semibold text-gray-900">{rx.medicationName}</td>
                        <td className="py-1.5 px-2.5 text-gray-700">{rx.dosage || 'Standard dose'}</td>
                        <td className="py-1.5 px-2.5 text-gray-700">{rx.frequency || 'As directed'}</td>
                        <td className="py-1.5 px-2.5 text-gray-700">
                          {rx.prescribedBy
                            ? rx.prescribedBy.trim().toLowerCase().startsWith('dr')
                              ? rx.prescribedBy
                              : `Dr. ${rx.prescribedBy}`
                            : 'Treating Physician'}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-gray-600">
                          {rx.refillDueDate ? format(new Date(rx.refillDueDate), 'MMM d, yyyy') : 'Regular'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Scheduled Consultations & Recent Clinical History */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scheduled Consultations */}
            <div>
              <div className="flex items-center gap-1.5 border-b border-gray-300 pb-1.5 mb-2">
                <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Scheduled Consultations
                </h2>
              </div>

              {upcomingAppointments.length === 0 ? (
                <p className="text-[11px] text-gray-500 italic py-1">No upcoming appointments scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingAppointments.slice(0, 2).map((a) => (
                    <div key={a._id} className="rounded-lg border border-gray-300 p-2.5 text-[11px] bg-gray-50/50 print:bg-transparent">
                      <div className="flex items-center justify-between font-bold text-gray-900">
                        <span>{a.title}</span>
                        <span className="text-emerald-800">{format(new Date(a.dateTime), 'EEE, MMM d • h:mm a')}</span>
                      </div>
                      <p className="mt-0.5 text-gray-600">
                        {a.doctorName ? `Dr. ${a.doctorName}` : 'Doctor'}{a.specialty ? ` (${a.specialty})` : ''} • {a.clinic || a.location || 'Clinic'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-500">
                        Accompanied by: <strong>{a.assignedTo?.name || 'Family member'}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Completed Consultations & Diagnostics */}
            <div>
              <div className="flex items-center gap-1.5 border-b border-gray-300 pb-1.5 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Recent Consultations & Diagnostics
                </h2>
              </div>

              {pastAppointments.length === 0 ? (
                <p className="text-[11px] text-gray-500 italic py-1">No prior clinic visits recorded.</p>
              ) : (
                <div className="space-y-2">
                  {pastAppointments.slice(0, 2).map((pa) => (
                    <div key={pa._id} className="rounded-lg border border-gray-300 p-2.5 text-[11px] bg-gray-50/50 print:bg-transparent">
                      <div className="flex items-center justify-between font-bold text-gray-900">
                        <span>{pa.title}</span>
                        <span className="text-gray-500">{format(new Date(pa.dateTime), 'MMM d, yyyy')}</span>
                      </div>
                      <p className="mt-0.5 text-gray-600">
                        {pa.doctorName ? `Dr. ${pa.doctorName}` : ''}{pa.specialty ? ` (${pa.specialty})` : ''} • {pa.clinic || pa.location || 'Clinic'}
                      </p>
                      {pa.notes && (
                        <p className="mt-0.5 text-[10px] text-gray-500 italic">
                          Notes: {pa.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Doctor Observations / Clinical Notes (Lined Area for In-Person Physician Notes) */}
          <div className="pt-1">
            <div className="flex items-center justify-between border-b border-gray-300 pb-1 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Physician Clinical Observations & Instructions (For In-Person Consultation)
              </span>
              <span className="text-[10px] text-gray-500">Doctor Signature & Date</span>
            </div>
            <div className="h-24 rounded-lg border border-dashed border-gray-400 p-2.5 relative bg-gray-50/30 print:bg-transparent">
              <div className="border-b border-gray-300 mt-5" />
              <div className="border-b border-gray-300 mt-5" />
              <div className="border-b border-gray-300 mt-5" />
            </div>
          </div>

          {/* Legal / CareRelay Coordination Notice */}
          <div className="border-t border-gray-300 pt-2 text-[9px] text-gray-500 flex items-center justify-between">
            <p className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Notice: CareRelay is an organisational care coordination hub and does not prescribe, diagnose, or replace physician judgment.
            </p>
            <p className="font-semibold text-gray-600">Page 1 of 1</p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
