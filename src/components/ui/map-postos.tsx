'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'

export interface PostoMapItem {
  id: string
  nome: string
  endereco: string
  bandeira: string
  avaliacao: number | null
  parceiro: boolean
  combustiveis: string[]
  lat: number
  lng: number
}

function makePostoIcon(parceiro: boolean) {
  const color = parceiro ? '#2563eb' : '#6b7280'
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);
    "></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  })
}

function makeUserIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:20px;height:20px;">
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:rgba(37,99,235,0.2);
          animation:pulse 2s infinite;
        "></div>
        <div style="
          position:absolute;inset:4px;border-radius:50%;
          background:#2563eb;border:2px solid white;
          box-shadow:0 2px 6px rgba(37,99,235,.5);
        "></div>
      </div>
      <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.8);opacity:.2}}</style>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  })
}

function MapController({ postos, userLocation }: { postos: PostoMapItem[]; userLocation: [number, number] | null }) {
  const map = useMap()

  useEffect(() => {
    // Centraliza na localização do usuário imediatamente
    if (userLocation) {
      map.setView(userLocation, 13, { animate: true })
    }
  }, [userLocation, map])

  useEffect(() => {
    // Ajusta bounds para incluir usuário + postos quando ambos disponíveis
    if (postos.length === 0) return
    const points: [number, number][] = postos.map((p) => [p.lat, p.lng])
    if (userLocation) points.push(userLocation)
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
  }, [postos, map]) // Intencionalmente sem userLocation para não re-fit ao mover

  return null
}

interface Props {
  postos: PostoMapItem[]
  userLocation: [number, number] | null
}

export function MapPostos({ postos, userLocation }: Props) {
  const defaultCenter: [number, number] = userLocation ?? [-14.235, -51.925] // Brasil centralizado

  return (
    <MapContainer
      center={defaultCenter}
      zoom={userLocation ? 13 : 4}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController postos={postos} userLocation={userLocation} />

      {/* Marcador do usuário */}
      {userLocation && (
        <Marker position={userLocation} icon={makeUserIcon()}>
          <Popup minWidth={160}>
            <p className="text-sm font-semibold text-gray-800 py-1">Sua localização</p>
          </Popup>
        </Marker>
      )}

      {/* Marcadores dos postos */}
      {postos.map((posto) => (
        <Marker key={posto.id} position={[posto.lat, posto.lng]} icon={makePostoIcon(posto.parceiro)}>
          <Popup minWidth={220}>
            <div className="space-y-1.5 py-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{posto.nome}</p>
                {posto.parceiro && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                    Parceiro
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-snug">{posto.endereco}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {posto.avaliacao !== null && <span>⭐ {posto.avaliacao.toFixed(1)}</span>}
                {posto.avaliacao !== null && <span>·</span>}
                <span>{posto.bandeira}</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {posto.combustiveis.map((c) => (
                  <span key={c} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
              <Link
                href={`/empresa/marketplace/${posto.id}`}
                className="block mt-2 text-center text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition-colors"
              >
                Ver detalhes →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
