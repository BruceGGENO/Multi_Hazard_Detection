'use client';
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { hasCoordinates, statusLabel, type RecordRow } from '@/lib/incidents';
export type Boundary = { district:string; polygon:[number,number][] };
const colors = {low:'#60a5fa',moderate:'#facc15',high:'#fb923c',critical:'#f87171'};
export default function RiskMap({boundaries,incidents=[],onSelect,onLocation,draft}:{
  boundaries:Boundary[];incidents?:RecordRow[];onSelect?:(id:string)=>void;
  onLocation?:(latitude:number,longitude:number)=>void;draft?:[number,number];
}) {
  const container=useRef<HTMLDivElement>(null),map=useRef<Leaflet.Map|null>(null);
  const overlays=useRef<Leaflet.LayerGroup|null>(null),flags=useRef(new Map<string,Leaflet.Marker>());
  const pick=useRef(onSelect),location=useRef(onLocation);pick.current=onSelect;location.current=onLocation;
  const draftMarker=useRef<Leaflet.CircleMarker|null>(null);
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    let disposed=false;
    import('leaflet').then(L=>{
      if(disposed||!container.current)return;
      const m=L.map(container.current,{scrollWheelZoom:false}).setView([-1.94,29.87],8);map.current=m;
      const street=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19});
      const satellite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Tiles &copy; Esri, Maxar, Earthstar Geographics, GIS User Community',maxZoom:19});
      [street,satellite].forEach(layer=>layer.on('tileerror',()=>setError('Some map tiles could not load. Check connectivity or switch the base layer.')));
      street.addTo(m);L.control.layers({'OpenStreetMap':street,'Satellite':satellite}).addTo(m);
      overlays.current=L.layerGroup().addTo(m);
      m.on('click',(e:Leaflet.LeafletMouseEvent)=>location.current?.(e.latlng.lat,e.latlng.lng));
      setReady(true);
    }).catch(()=>setError('Map could not initialize.'));
    return()=>{disposed=true;map.current?.remove();map.current=null;flags.current.clear();};
  },[]);
  useEffect(()=>{
    if(!ready)return;let disposed=false;
    import('leaflet').then(L=>{
      if(disposed||!overlays.current)return;
      overlays.current.clearLayers();
      boundaries.forEach(b=>{const label=document.createElement('span');label.textContent=b.district;L.polygon(b.polygon,{color:'#67a8ff',weight:2,fillOpacity:.12}).bindTooltip(label).addTo(overlays.current!);});
    });return()=>{disposed=true;};
  },[boundaries,ready]);
  useEffect(()=>{
    if(!ready)return;let disposed=false;
    import('leaflet').then(L=>{
      if(disposed||!map.current)return;
      const active=new Set<string>();
      incidents.forEach(incident=>{
        if(!hasCoordinates(incident.data)||incident.data.verification==='rejected')return;
        active.add(incident.id);
        const data=incident.data,color=colors[data.severity??'moderate'];
        const symbol=document.createElement('span');
        symbol.className='incident-beacon';symbol.style.setProperty('--hazard-color',color);
        symbol.classList.toggle('pending',!['verified'].includes(data.verification??'pending'));
        symbol.textContent=data.verification==='verified'?'✓':'!';
        const title=[data.hazardType??'Hazard',data.severity??'Unspecified severity',incident.district,statusLabel(data)].join(' · ');
        const tooltip=document.createElement('div');tooltip.className='incident-tooltip';
        [data.hazardType??'Hazard',`${data.severity??'Unspecified'} · ${incident.district}`,new Date(data.observedAt??incident.created_at).toLocaleString(),statusLabel(data)].forEach(text=>{const line=document.createElement('div');line.textContent=text;tooltip.appendChild(line);});
        const icon=L.divIcon({className:'incident-flag',html:symbol,iconSize:[30,30],iconAnchor:[15,15]});
        let marker=flags.current.get(incident.id);
        if(!marker){
          marker=L.marker([data.latitude!,data.longitude!],{icon,title,alt:title,keyboard:true,riseOnHover:true}).addTo(map.current!);
          marker.on('click',()=>pick.current?.(incident.id));
          flags.current.set(incident.id,marker);
        }else {marker.setLatLng([data.latitude!,data.longitude!]);marker.setIcon(icon);}
        const element=marker.getElement();element?.setAttribute('aria-label',title);element?.setAttribute('title',title);
        marker.unbindTooltip();marker.bindTooltip(tooltip,{direction:'top',offset:[0,-15],interactive:true});
      });
      flags.current.forEach((marker,id)=>{if(!active.has(id)){marker.remove();flags.current.delete(id);}});
    });return()=>{disposed=true;};
  },[incidents,ready]);
  useEffect(()=>{
    if(!ready)return;let disposed=false;
    import('leaflet').then(L=>{if(disposed||!map.current)return;draftMarker.current?.remove();if(draft){draftMarker.current=L.circleMarker(draft,{radius:9,color:'#c4b5fd',fillOpacity:.6}).addTo(map.current);map.current.panTo(draft);}});
    return()=>{disposed=true;};
  },[draft,ready]);
  useEffect(()=>{
    if(!container.current)return;
    const observer=new ResizeObserver(()=>map.current?.invalidateSize());observer.observe(container.current);return()=>observer.disconnect();
  },[]);
  return <><div ref={container} className="operational-map" aria-label={onLocation?'Click map to select incident coordinates':'Rwanda live incident map'}/>{error&&<p role="status" className="notice">{error}</p>}<div className="hazard-legend">{Object.entries(colors).map(([severity,color])=><span key={severity}><i style={{background:color}}/>{severity}</span>)}<span>! pending · ✓ verified</span></div></>;
}
