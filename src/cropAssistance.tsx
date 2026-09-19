import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { AlertTriangle, ArrowLeft, Check, ImagePlus, ShieldCheck } from 'lucide-react'
import { api } from './api'
import type { Diagnosis } from './api'
import './cropAssistance.css'

type Text = (key: string) => string
type Props = { t: Text; token: string; language: string; go: (page: 'farmer' | 'crop-assistance') => void }
const maxSize = 5 * 1024 * 1024
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
const dateText = (value: string) => new Date(value).toLocaleString('en-IN')
const confidenceText = (value: number | null | undefined) => value == null ? '-' : `${Math.round(value <= 1 ? value * 100 : value)}%`

export function CropAssistance({ t, token, language, go }: Props) {
  const [crop, setCrop] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [history, setHistory] = useState<Diagnosis[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; setError(''); if (!file) return; if (!allowedTypes.includes(file.type) || file.size > maxSize) return setError(t('invalidImage')); setImage(file); setPreview(URL.createObjectURL(file)); setDiagnosis(null) }
  useEffect(() => { api.diagnosisHistory(token).then(data => setHistory(data.diagnoses)).catch(() => undefined) }, [token])
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!crop) return setError(t('cropRequired')); if (!image) return setError(t('imageRequired')); setLoading(true); setError(''); try { const result = await api.submitDiagnosis(crop, image, token, language); setDiagnosis({ ...result.diagnosis, analysis: result.analysis }); setHistory([result.diagnosis, ...history]) } catch (err) { setError(err instanceof Error ? err.message : t('diagnosisFailed')) } finally { setLoading(false) } }
  return <main className="dashboard-page crop-assistance-page"><button className="back-button" onClick={() => go('farmer')}><ArrowLeft size={14} /> {t('back')}</button><div className="dashboard-heading"><div><p className="eyebrow">{t('cropAssistance')}</p><h1>{t('cropAssistance')}</h1><p>{t('cropAssistanceHelp')}</p></div></div><div className="demo-safety"><ShieldCheck size={18} /><span><strong>{t('demoResult')}</strong>{t('notRealDiagnosis')}</span></div><form className="diagnosis-form" onSubmit={submit}><label className="field"><span>{t('chooseCrop')}</span><select value={crop} onChange={event => setCrop(event.target.value)} required><option value="">{t('selectCrop')}</option>{['paddy', 'cotton', 'chilli', 'maize', 'tomato', 'otherCrop'].map(option => <option value={option === 'otherCrop' ? 'Other crop' : option} key={option}>{t(option)}</option>)}</select></label><div className="upload-panel"><div className="upload-preview">{preview ? <img src={preview} alt={t('cropPhoto')} /> : <ImagePlus size={36} />}</div><div><strong>{t('cropPhoto')}</strong><p>{t('supportedImageTypes')}</p><label className="primary-button upload-button">{preview ? t('replaceImage') : t('chooseImage')}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} /></label><small>{t('keepPrivate')}</small></div></div>{error && <p className="error-message">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? t('processing') : t('analyzeImage')} <ArrowLeft size={16} className="rotate-arrow" /></button></form>{diagnosis && <DiagnosisResult t={t} diagnosis={diagnosis} />}{history.length > 0 && <section className="diagnosis-history"><h2>{t('history')}</h2>{history.map(item => <DiagnosisRow t={t} key={item.id} diagnosis={item} />)}</section>}</main>
}
function DiagnosisResult({ t, diagnosis }: { t: Text; diagnosis: Diagnosis }) { const low = diagnosis.resultStatus === 'LOW_CONFIDENCE'; const unsupported = diagnosis.resultStatus === 'UNSUPPORTED'; const analysis = diagnosis.analysis; return <section className={low || unsupported ? 'diagnosis-result low' : 'diagnosis-result'}><div className="result-heading">{low || unsupported ? <AlertTriangle size={22} /> : <Check size={22} />}<div><p className="eyebrow">{diagnosis.resultStatus === 'COMPLETED' ? t('completed') : diagnosis.resultStatus === 'UNSUPPORTED' ? t('unsupportedCrop') : t('lowConfidence')}</p><h2>{diagnosis.prediction || t('assistanceUnavailable')}</h2></div></div>{unsupported ? <p>{t('unsupportedCropText')}</p> : <><p><strong>{t('confidence')}:</strong> {confidenceText(diagnosis.confidence)} <small>{t('confidenceLimit')}</small></p>{analysis ? <><p><strong>{t('observedSymptoms')}:</strong> {analysis.observedSymptoms.join(', ') || t('notEnoughEvidence')}</p><p><strong>{t('explanation')}:</strong> {analysis.explanation}</p><p><strong>{t('nextSteps')}:</strong> {analysis.recommendedNextSteps.join(' ')}</p><p className="expert-route"><strong>{t('kvkHelp')}</strong> {analysis.whenToSeekExpertHelp}</p></> : <p>{low ? t('lowConfidenceText') : t('guidanceText')}</p>}</>}<small>{diagnosis.provider} · {t('modelVersion')} {diagnosis.modelVersion}</small></section> }
function DiagnosisRow({ t, diagnosis }: { t: Text; diagnosis: Diagnosis }) { return <article className="diagnosis-row"><div><strong>{diagnosis.cropName}</strong><span>{diagnosis.prediction || t('assistanceUnavailable')}</span></div><div><b>{confidenceText(diagnosis.confidence)}</b><small>{dateText(diagnosis.createdAt)}</small></div></article> }
