const ATLAS_CARNET_FORMAT="atlas-carnet";
const ATLAS_CARNET_SCHEMA_VERSION=1;
const ATLAS_CARNET_IMPORT_LIMIT_BYTES=16*1024*1024;
const ATLAS_CARNET_RECOMMENDED_BYTES=4*1024*1024;
const carnetRuntime={
  ready:true,built:0,validated:0,migrations:0,imports:0,exports:0,lastBytes:0,lastAlgorithm:"—",lastError:""
};

function carnetRecordError(error){
  carnetRuntime.lastError=String(error?.message||error||"Erreur de carnet");
  return error;
}
function carnetJsonClone(value){
  return JSON.parse(JSON.stringify(value??null));
}
function carnetStableJson(value){
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(carnetStableJson).join(",")}]`;
  return `{${Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>`${JSON.stringify(key)}:${carnetStableJson(value[key])}`).join(",")}}`;
}
function carnetUtf8Bytes(text){return new TextEncoder().encode(text)}
function carnetHex(buffer){return [...new Uint8Array(buffer)].map(byte=>byte.toString(16).padStart(2,"0")).join("")}
function carnetFnv1a(bytes){
  let hash=2166136261;
  for(const byte of bytes){hash^=byte;hash=Math.imul(hash,16777619)}
  return (hash>>>0).toString(16).padStart(8,"0");
}
async function carnetDigest(text,algorithm=""){
  const bytes=carnetUtf8Bytes(text),requested=String(algorithm||"").toUpperCase();
  if(requested==="FNV-1A-32")return {algorithm:"FNV-1A-32",digest:carnetFnv1a(bytes),bytes:bytes.byteLength};
  if(globalThis.crypto?.subtle){
    const digest=await globalThis.crypto.subtle.digest("SHA-256",bytes);
    return {algorithm:"SHA-256",digest:carnetHex(digest),bytes:bytes.byteLength};
  }
  if(requested&&requested!=="FNV-1A-32")throw new Error(`Algorithme d’intégrité non disponible : ${algorithm}`);
  return {algorithm:"FNV-1A-32",digest:carnetFnv1a(bytes),bytes:bytes.byteLength};
}
function carnetUnsigned(document){
  const unsigned=carnetJsonClone(document);delete unsigned.integrity;return unsigned;
}
async function sealAtlasCarnet(document){
  const unsigned=carnetUnsigned(document),result=await carnetDigest(carnetStableJson(unsigned));
  return {...unsigned,integrity:{algorithm:result.algorithm,digest:result.digest,bytes:result.bytes}};
}
function carnetArray(value){return Array.isArray(value)?carnetJsonClone(value):[]}
function carnetSummary(document){
  const content=document.content||{},extracts=document.sources?.extracts||{};
  return {
    observations:content.observations?.length||0,personalMarkers:content.personalMarkers?.length||0,undergroundHypotheses:content.undergroundHypotheses?.length||0,
    notes:content.notes?.length||0,annotations:Object.keys(content.annotations||{}).length,
    embeddedRecords:(extracts.officialCavities?.length||0)+(extracts.cartofriches?.length||0)+(extracts.heritageItems?.length||0)+(extracts.bss?.length||0)+(extracts.hydrometry?.length||0)+(extracts.biodiversity?.length||0)+(extracts.address?1:0),
    sourceReferences:document.sources?.references?.length||0
  };
}
async function buildAtlasCarnet(snapshot=buildAtlasSnapshot()){
  validateAtlasSnapshot(snapshot);
  const d=snapshot.data||{},v=snapshot.view||{},now=new Date().toISOString(),territory=territorySnapshot(normalizeTerritoryProfile(snapshot.territory,CONFIG.territory));
  const document={
    format:ATLAS_CARNET_FORMAT,schema:ATLAS_CARNET_SCHEMA_VERSION,
    metadata:{id:territory.id,title:territory.label,language:"fr",createdAt:String(snapshot.createdAt||now),updatedAt:now,generator:{name:"Atlas Karst",version:APP_VERSION}},
    territory,
    content:{
      startPoint:carnetJsonClone(snapshot.house||territory.center),
      observations:carnetArray(d.observations),personalMarkers:carnetArray(d.personalMarkers),undergroundHypotheses:carnetArray(d.undergroundHypotheses),notes:carnetArray(d.loreItems),annotations:carnetJsonClone(d.poiAnnotations||{}),
      experiences:{collection:carnetJsonClone(d.encounterCollection||{}),enabled:!!d.encounterEnabled}
    },
    presentation:{
      renderMode:v.renderMode==="ascii"?"ascii":"symbolic",zoomIndex:Number(v.zoomIndex)||0,depthIndex:Number(v.depthIndex)||0,
      center:carnetJsonClone(v.center||territory.center),scenario:String(v.scenario||"default"),layers:carnetJsonClone(v.layers||{}),
      filters:{heritage:carnetJsonClone(d.heritageEnabled||{})}
    },
    sources:{
      references:sourceReferencesForSnapshot(snapshot),
      extracts:{address:carnetJsonClone(d.address||null),officialCavities:carnetArray(d.officialCavities),cartofriches:carnetArray(d.cartofriches),heritageItems:carnetArray(d.heritageItems),bss:carnetArray(d.bss),hydrometry:carnetArray(d.hydrometry),biodiversity:carnetArray(d.biodiversity),biodiversityEnabled:carnetJsonClone(d.biodiversityEnabled||{}),natureAreas:carnetArray(d.natureAreas)}
    },
    cachePolicy:{embedded:false,excluded:["osm","cadastreBuildings","cadastreParcels","elevation","coverage"],refresh:"manual"}
  };
  document.summary=carnetSummary(document);
  const sealed=await sealAtlasCarnet(document);carnetRuntime.built++;carnetRuntime.lastBytes=sealed.integrity.bytes;carnetRuntime.lastAlgorithm=sealed.integrity.algorithm;carnetRuntime.lastError="";return sealed;
}
async function validateAtlasCarnet(document,{verifyIntegrity=true}={}){
  try{
    if(!document||typeof document!=="object"||Array.isArray(document)||document.format!==ATLAS_CARNET_FORMAT)throw new Error("Format de carnet non reconnu");
    const schema=Number(document.schema);
    if(!Number.isInteger(schema)||schema<1)throw new Error("Version de carnet invalide");
    if(schema>ATLAS_CARNET_SCHEMA_VERSION)throw new Error(`Ce carnet utilise le schéma ${schema}, plus récent que le schéma ${ATLAS_CARNET_SCHEMA_VERSION} pris en charge.`);
    if(!document.metadata||typeof document.metadata!=="object"||!document.territory||typeof document.territory!=="object")throw new Error("Métadonnées ou territoire absents du carnet");
    if(!document.content||typeof document.content!=="object"||!document.sources||typeof document.sources!=="object")throw new Error("Contenu ou registre des sources absent du carnet");
    if(!Array.isArray(document.content.observations)||!Array.isArray(document.content.notes)||!Array.isArray(document.sources.references))throw new Error("Collections du carnet invalides");
    normalizeTerritoryProfile(document.territory,LEGACY_TERRITORY_PROFILE);
    if(verifyIntegrity){
      const expected=document.integrity;
      if(!expected?.algorithm||!expected?.digest)throw new Error("Contrôle d’intégrité absent");
      const actual=await carnetDigest(carnetStableJson(carnetUnsigned(document)),expected.algorithm);
      if(actual.digest!==expected.digest||actual.bytes!==Number(expected.bytes))throw new Error("Le carnet a été modifié ou endommagé : contrôle d’intégrité incorrect");
    }
    carnetRuntime.validated++;carnetRuntime.lastAlgorithm=document.integrity?.algorithm||"non vérifié";carnetRuntime.lastError="";return document;
  }catch(error){throw carnetRecordError(error)}
}
async function atlasCarnetToSnapshot(document){
  const carnet=await validateAtlasCarnet(document),content=carnet.content||{},presentation=carnet.presentation||{},extracts=carnet.sources?.extracts||{},experiences=content.experiences||{};
  return {
    format:"atlas-karst-snapshot",schema:SNAPSHOT_SCHEMA_VERSION,appVersion:APP_VERSION,createdAt:String(carnet.metadata?.createdAt||new Date().toISOString()),
    territory:territorySnapshot(normalizeTerritoryProfile(carnet.territory,LEGACY_TERRITORY_PROFILE)),house:carnetJsonClone(content.startPoint||carnet.territory.center),
    view:{mode:"classic",renderMode:presentation.renderMode==="ascii"?"ascii":"symbolic",zoomIndex:Number(presentation.zoomIndex)||0,depthIndex:Number(presentation.depthIndex)||0,center:carnetJsonClone(presentation.center||carnet.territory.center),scenario:String(presentation.scenario||"default"),layers:carnetJsonClone(presentation.layers||{})},
    data:{
      osm:[],osmMeta:null,osmBaseCoverage:[],osmDetailCoverage:[],cadastreBuildings:[],cadastreParcels:[],elevation:null,
      address:carnetJsonClone(extracts.address||null),officialCavities:carnetArray(extracts.officialCavities),cartofriches:carnetArray(extracts.cartofriches),heritageItems:carnetArray(extracts.heritageItems),bss:carnetArray(extracts.bss),hydrometry:carnetArray(extracts.hydrometry),biodiversity:carnetArray(extracts.biodiversity),biodiversityEnabled:carnetJsonClone(extracts.biodiversityEnabled||{}),natureAreas:carnetArray(extracts.natureAreas),
      heritageEnabled:carnetJsonClone(presentation.filters?.heritage||{}),poiAnnotations:normalizePoiAnnotations(content.annotations||{}),observations:carnetArray(content.observations),personalMarkers:carnetArray(content.personalMarkers),undergroundHypotheses:carnetArray(content.undergroundHypotheses),loreItems:carnetArray(content.notes),encounterCollection:carnetJsonClone(experiences.collection||{}),encounterEnabled:!!experiences.enabled
    }
  };
}
