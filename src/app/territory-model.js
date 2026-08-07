const TERRITORY_PROFILE_SCHEMA=1;
let territoryDataRevision=0;
const LEGACY_TERRITORY_PROFILE=Object.freeze({
  schema:TERRITORY_PROFILE_SCHEMA,
  id:"angouleme-karst",
  label:"Atlas historique d’Angoulême",
  center:{lat:45.5980539,lon:0.1471943},
  sizeKm:{width:16,height:16},
  administration:{
    countryCode:"FR",
    departmentCode:"16",
    departmentName:"Charente",
    communeInsee:"16418"
  },
  embeddedData:{bss:true,cavityInventory:true,fallbackSurface:true,offlineDemo:true},
  provenance:"profil patrimonial embarqué"
});

function territoryFiniteNumber(value,fallback){
  const number=Number(value);
  return Number.isFinite(number)?number:fallback;
}
function territoryText(value,fallback=""){
  const result=String(value??"").trim();
  return result||fallback;
}
function normalizeTerritoryProfile(value,fallback=LEGACY_TERRITORY_PROFILE){
  const raw=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const base=fallback&&typeof fallback==="object"?fallback:LEGACY_TERRITORY_PROFILE;
  const centerRaw=raw.center&&typeof raw.center==="object"?raw.center:{};
  const sizeRaw=raw.sizeKm&&typeof raw.sizeKm==="object"?raw.sizeKm:{};
  const adminRaw=raw.administration&&typeof raw.administration==="object"?raw.administration:{};
  const embeddedRaw=raw.embeddedData&&typeof raw.embeddedData==="object"?raw.embeddedData:{};
  const center={
    lat:Math.max(-85,Math.min(85,territoryFiniteNumber(centerRaw.lat,base.center.lat))),
    lon:Math.max(-180,Math.min(180,territoryFiniteNumber(centerRaw.lon,base.center.lon)))
  };
  const width=Math.max(1,Math.min(64,territoryFiniteNumber(sizeRaw.width,base.sizeKm.width)));
  const height=Math.max(1,Math.min(64,territoryFiniteNumber(sizeRaw.height,base.sizeKm.height)));
  return {
    schema:TERRITORY_PROFILE_SCHEMA,
    id:territoryText(raw.id,base.id),
    label:territoryText(raw.label,base.label),
    center,
    sizeKm:{width,height},
    administration:{
      countryCode:territoryText(adminRaw.countryCode,base.administration.countryCode).toUpperCase(),
      departmentCode:territoryText(adminRaw.departmentCode,base.administration.departmentCode),
      departmentName:territoryText(adminRaw.departmentName,base.administration.departmentName),
      communeInsee:territoryText(adminRaw.communeInsee,base.administration.communeInsee)
    },
    embeddedData:{
      bss:embeddedRaw.bss===undefined?!!base.embeddedData.bss:!!embeddedRaw.bss,
      cavityInventory:embeddedRaw.cavityInventory===undefined?!!base.embeddedData.cavityInventory:!!embeddedRaw.cavityInventory,
      fallbackSurface:embeddedRaw.fallbackSurface===undefined?!!base.embeddedData.fallbackSurface:!!embeddedRaw.fallbackSurface,
      offlineDemo:embeddedRaw.offlineDemo===undefined?!!base.embeddedData.offlineDemo:!!embeddedRaw.offlineDemo
    },
    provenance:territoryText(raw.provenance,base.provenance)
  };
}
function applyTerritoryProfileToConfig(config,profile){
  const normalized=normalizeTerritoryProfile(profile,config?.territory||LEGACY_TERRITORY_PROFILE);
  config.territory=normalized;
  config.dataCenter={...normalized.center};
  config.dataWidthKm=normalized.sizeKm.width;
  config.dataHeightKm=normalized.sizeKm.height;
  config.communeInsee=normalized.administration.communeInsee;
  return normalized;
}
function territoryDepartmentValues(profile,numeric=false){
  const normalized=normalizeTerritoryProfile(profile||LEGACY_TERRITORY_PROFILE);
  const code=normalized.administration.departmentCode;
  const name=normalized.administration.departmentName;
  const padded=/^\d+$/.test(code)?code.padStart(3,"0"):code;
  return [...new Set((numeric?[code,padded,name]:[name,code,padded]).filter(Boolean))];
}
function territoryUsesEmbeddedData(kind,profile){
  const normalized=normalizeTerritoryProfile(profile||LEGACY_TERRITORY_PROFILE);
  return !!normalized.embeddedData[kind];
}
function territorySnapshot(profile){
  return normalizeTerritoryProfile(profile||LEGACY_TERRITORY_PROFILE);
}
function territorySafeId(value){
  return territoryText(value,"territoire").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,54)||"territoire";
}
function createUserTerritoryProfile({label="Mon territoire",center}={}){
  const lat=territoryFiniteNumber(center?.lat,LEGACY_TERRITORY_PROFILE.center.lat);
  const lon=territoryFiniteNumber(center?.lon,LEGACY_TERRITORY_PROFILE.center.lon);
  const safeLabel=territoryText(label,"Mon territoire");
  return normalizeTerritoryProfile({
    schema:TERRITORY_PROFILE_SCHEMA,
    id:`${territorySafeId(safeLabel)}-${lat.toFixed(4)}-${lon.toFixed(4)}`,
    label:safeLabel,
    center:{lat,lon},
    sizeKm:{width:16,height:16},
    administration:{countryCode:"",departmentCode:"",departmentName:"",communeInsee:""},
    embeddedData:{bss:false,cavityInventory:false,fallbackSurface:false,offlineDemo:false},
    provenance:"territoire défini par l’utilisateur"
  },{
    ...LEGACY_TERRITORY_PROFILE,
    administration:{countryCode:"",departmentCode:"",departmentName:"",communeInsee:""},
    embeddedData:{bss:false,cavityInventory:false,fallbackSurface:false,offlineDemo:false}
  });
}
function territoryAdministrationFromAddress(address){
  const citycode=territoryText(address?.citycode);
  const context=territoryText(address?.context).split(",").map(value=>value.trim()).filter(Boolean);
  const inferredCode=context[0]||(/^97\d|^98\d/.test(citycode)?citycode.slice(0,3):citycode.slice(0,2));
  return {
    countryCode:citycode?"FR":"",
    departmentCode:inferredCode,
    departmentName:context[1]||"",
    communeInsee:citycode
  };
}
function enrichTerritoryAdministration(profile,address){
  return normalizeTerritoryProfile({...profile,administration:territoryAdministrationFromAddress(address)},profile);
}
function territoryStorageKey(base,profile){
  const active=profile||(typeof CONFIG!=="undefined"?CONFIG.territory:null)||LEGACY_TERRITORY_PROFILE;
  const normalized=normalizeTerritoryProfile(active);
  if(normalized.id===LEGACY_TERRITORY_PROFILE.id)return base;
  return `${base}--${territorySafeId(normalized.id)}`;
}
function updateTerritoryIdentityUI(){
  if(typeof CONFIG==="undefined")return;
  const territory=CONFIG.territory;if(!territory)return;
  if(typeof els!=="undefined"&&els?.territorySummary)els.territorySummary.textContent=`Territoire actif · ${territory.label} · ${territory.sizeKm.width} × ${territory.sizeKm.height} km`;
}
function beginTerritoryDataRevision(){territoryDataRevision++;return territoryDataRevision}
function territoryRequestStamp(){return {revision:territoryDataRevision,id:CONFIG.territory.id}}
function territoryRequestIsCurrent(stamp){return !!stamp&&stamp.revision===territoryDataRevision&&stamp.id===CONFIG.territory.id}
