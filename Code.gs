/** Raka Sang Analis V5.2 — Google Apps Script backend
 * Jalankan setupNewSpreadsheet() sekali dari editor Apps Script.
 * Setelah authorize, URL spreadsheet muncul di Logs.
 */
const APP = { VERSION: '5.3', TOKEN_HOURS: 24 };

// Canonical event list used to keep older Sheets/API responses complete.
const DEFAULT_RECAP = [
  {name:'CPI',w:4,l:4}, {name:'FOMC',w:6,l:1}, {name:'NFP',w:9,l:2},
  {name:'PPI',w:3,l:0}, {name:'PCE',w:3,l:0}, {name:'Jackson Hole',w:1,l:0}
];
const DEFAULT_NEWS = [
  {id:1,name:'NFP',full:'Non Farm Payroll',date:'2026-10-02T19:30',impact:'HIGH',bias:'BULLISH GOLD',confidence:'HIGH',analysis:'Fokus utama pada actual vs forecast dan reaksi US10Y/DXY. Jika data tenaga kerja melemah secara signifikan, tekanan terhadap USD berpotensi meningkat dan memberikan ruang bullish pada gold.',actual:'+125K',forecast:'+180K',previous:'+210K'},
  {id:2,name:'CPI',full:'Consumer Price Index',date:'2026-10-14T19:30',impact:'HIGH',bias:'BULLISH GOLD',confidence:'HIGH',analysis:'Pantau headline dan core CPI. Reaksi yield serta ekspektasi kebijakan Fed menjadi konfirmasi penting setelah angka rilis.',actual:'—',forecast:'—',previous:'—'},
  {id:3,name:'PPI',full:'Producer Price Index',date:'2026-10-13T19:30',impact:'HIGH',bias:'BEARISH GOLD',confidence:'MEDIUM',analysis:'PPI dapat memberi petunjuk tekanan harga sebelum CPI. Fokus pada surprise terhadap forecast dan reaksi USD/yield.',actual:'—',forecast:'—',previous:'—'},
  {id:4,name:'FOMC',full:'Federal Open Market Committee',date:'2026-10-28T01:00',impact:'HIGH',bias:'NEUTRAL',confidence:'MEDIUM',analysis:'Perhatikan keputusan rate, statement, dot plot, serta tone Powell. Headline rate saja tidak cukup untuk menentukan bias.',actual:'—',forecast:'—',previous:'—'},
  {id:5,name:'PCE',full:'Personal Consumption Expenditures',date:'2026-10-30T19:30',impact:'HIGH',bias:'BULLISH GOLD',confidence:'MEDIUM',analysis:'Core PCE menjadi fokus utama untuk membaca tekanan inflasi dan ekspektasi jalur suku bunga.',actual:'—',forecast:'—',previous:'—'},
  {id:6,name:'Jackson Hole',full:'Jackson Hole Symposium',date:'2026-08-28T21:00',impact:'HIGH',bias:'BULLISH GOLD',confidence:'HIGH',analysis:'Historical event untuk library dan performance tracking.',actual:'—',forecast:'—',previous:'—'}
];
function mergeRecap_(source) {
  let rows = source; if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch (e) { rows = []; } }
  rows = Array.isArray(rows) ? rows : [];
  return DEFAULT_RECAP.map(def => {
    const found = rows.find(x => x && String(x.name || '').trim().toLowerCase() === def.name.toLowerCase());
    return found ? {name:def.name,w:Math.max(0,Number(found.w != null ? found.w : def.w)||0),l:Math.max(0,Number(found.l != null ? found.l : def.l)||0)} : {name:def.name,w:def.w,l:def.l};
  });
}
function mergeNews_(source) {
  const rows = Array.isArray(source) ? source : [];
  const merged = DEFAULT_NEWS.map(def => { const found = rows.find(x => x && String(x.name || '').trim().toLowerCase() === def.name.toLowerCase()); return found ? Object.assign({}, def, found) : Object.assign({}, def); });
  rows.forEach(item => { if (item && item.name && !merged.some(x => String(x.name).toLowerCase() === String(item.name).toLowerCase())) merged.push(item); });
  return merged;
}
const SHEETS = {
  Users: ['username','passwordHash','role','active','createdAt'],
  Sessions: ['token','username','expiresAt','createdAt'],
  News: ['id','username','json','updatedAt'],
  History: ['id','username','json','updatedAt'],
  Settings: ['key','value'],
  Requests: ['id','username','json','updatedAt'],
  Videos: ['id','username','json','updatedAt'],
  Valetax: ['id','username','json','updatedAt'],
  Journal: ['id','username','json','updatedAt'],
  Recap: ['key','value'],
  AuditLog: ['time','username','action','detail']
};
function setupNewSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SPREADSHEET_ID');
  let ss;
  if (id) { ss = SpreadsheetApp.openById(id); }
  else {
    ss = SpreadsheetApp.create('Raka Sang Analis — Database');
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }
  Object.keys(SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(SHEETS[name]);
    else if (String(sh.getRange(1,1,1,SHEETS[name].length).getValues()[0][0]) !== SHEETS[name][0]) {
      sh.clear(); sh.appendRow(SHEETS[name]);
    }
  });
  // Private Drive folder for payment proofs. Files stay private to the script owner.
  const driveProps = PropertiesService.getScriptProperties();
  let proofFolderId = driveProps.getProperty('PAYMENT_PROOF_FOLDER_ID');
  if (!proofFolderId) {
    const proofFolder = DriveApp.createFolder('Raka Sang Analis - Bukti Pembayaran');
    proofFolderId = proofFolder.getId();
    driveProps.setProperty('PAYMENT_PROOF_FOLDER_ID', proofFolderId);
  }
  const settings = ss.getSheetByName('Settings');
  if (settings.getLastRow() < 2) settings.appendRow(['serverName','Raka Sang Analis']);
  const recap = ss.getSheetByName('Recap');
  if (recap.getLastRow() < 2) { recap.appendRow(['overallWr','78.89%']); recap.appendRow(['recap', JSON.stringify(DEFAULT_RECAP)]); }
  // Migrate older recap values without deleting any existing counts.
  const oldRecap = getSetting_('recap', '');
  const completeRecap = mergeRecap_(oldRecap);
  setSetting_('recap', JSON.stringify(completeRecap));
  if (!getSetting_('overallWr', '')) setSetting_('overallWr', '78.89%');
  Logger.log('SPREADSHEET_URL=' + ss.getUrl());
  Logger.log('PENTING: buat akun OWNER melalui fungsi createInitialOwner() setelah mengatur password di Script Properties.');
  return ss.getUrl();
}
/** Sebelum menjalankan, tambahkan Script Property INITIAL_OWNER_PASSWORD dengan password kuat. */
function createInitialOwner() {
  const props = PropertiesService.getScriptProperties();
  const password = props.getProperty('INITIAL_OWNER_PASSWORD');
  if (!password || password.length < 12) throw new Error('Set Script Property INITIAL_OWNER_PASSWORD minimal 12 karakter terlebih dahulu.');
  const sh = sheet_('Users');
  const rows = sh.getDataRange().getValues();
  if (rows.slice(1).some(r => String(r[0]).toLowerCase() === 'owner')) throw new Error('Akun owner sudah ada.');
  sh.appendRow(['owner', hash_(password), 'OWNER', true, new Date().toISOString()]);
  props.deleteProperty('INITIAL_OWNER_PASSWORD');
  Logger.log('Owner dibuat. Username: owner. Simpan password yang kamu set dengan aman.');
}
function doGet() { return json_({ok:true,app:'Raka Sang Analis',version:APP.VERSION,message:'API aktif'}); }
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(body.action || '');
    const result = handle_(action, body);
    return json_(Object.assign({ok:true}, result || {}));
  } catch (err) {
    return json_({ok:false,error:String(err && err.message || err)});
  }
}
function handle_(a,p) {
  if (a === 'register') {
    const username = clean_(p.username,30), password = String(p.password||'');
    if (!/^[A-Za-z0-9._-]{3,30}$/.test(username) || password.length < 8) throw Error('Username tidak valid atau password minimal 8 karakter.');
    const sh=sheet_('Users'), rows=sh.getDataRange().getValues();
    if(rows.slice(1).some(r=>String(r[0]).toLowerCase()===username.toLowerCase())) throw Error('Username sudah digunakan.');
    sh.appendRow([username,hash_(password),'VIEWER',true,new Date().toISOString()]);
    audit_(username,'register','Akun dibuat'); return {};
  }
  if (a === 'login') {
    const username=clean_(p.username,30), password=String(p.password||'');
    const sh=sheet_('Users'), rows=sh.getDataRange().getValues();
    const r=rows.slice(1).find(x=>String(x[0]).toLowerCase()===username.toLowerCase());
    if(!r || String(r[1])!==hash_(password) || r[3]===false || String(r[3]).toLowerCase()==='false') throw Error('Username atau password salah, atau akun dinonaktifkan.');
    const token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
    const now=Date.now(), expires=new Date(now+APP.TOKEN_HOURS*3600000).toISOString();
    sheet_('Sessions').appendRow([token,String(r[0]),expires,new Date(now).toISOString()]);
    audit_(r[0],'login',String(p.device||'').slice(0,180));
    return {session:{token,username:r[0],role:r[2],serverId:'RAKA-SHEETS',serverName:getSetting_('serverName','Raka Sang Analis')}};
  }
  if (a === 'logout') { const s=auth_(p.token,false); if(s) deleteRows_('Sessions',r=>String(r[0])===String(p.token)); return {}; }
  const sess = auth_(p.token, a !== 'getData');
  const role = sess ? userRole_(sess.username) : '';
  if (a === 'aiAnalyze') { return {analysis: analyzeXauusd_(String(p.timeframe||'1h'))}; }
  if (!sess && !['getData'].includes(a)) throw Error('Sesi tidak valid. Silakan login ulang.');
  if (a==='getData') {
    const s=auth_(p.token,true); if(!s) throw Error('Sesi habis. Silakan login ulang.');
    const storedRecap = mergeRecap_(getSetting_('recap', ''));
    // Persist the migration so subsequent reads are complete in the Sheet too.
    setSetting_('recap', JSON.stringify(storedRecap));
    return {news:mergeNews_(allJson_('News')),history:allJson_('History'),recap:storedRecap,overallWr:getSetting_('overallWr','78.89%'),settings:allSettings_(),users:role==='OWNER'||role==='ADMIN'?publicUsers_():[],serverId:'RAKA-SHEETS'};
  }
  if (a==='saveNews'||a==='deleteNews') { requireEditor_(role); if(a==='saveNews'){upsertJson_('News',p.news);return {news:allJson_('News')}} deleteRows_('News',r=>String(r[0])===String(p.id));return {news:allJson_('News')}; }
  if (a==='saveRecap') { requireEditor_(role); const complete=mergeRecap_(p.recap); const wr=String(p.overallWr||'78.89%'); setSetting_('recap',JSON.stringify(complete));setSetting_('overallWr',wr);audit_(sess.username,'saveRecap',JSON.stringify(complete));return {recap:complete,overallWr:wr}; }
  if (a==='saveSettings') { requireEditor_(role); Object.keys(p.settings||{}).forEach(k=>setSetting_(k,String(p.settings[k])));return {settings:allSettings_()}; }
  if (a==='createUser') { if(role!=='OWNER')throw Error('Hanya OWNER yang dapat membuat user/admin.'); const u=clean_(p.username,30),pw=String(p.password||'');if(!/^[A-Za-z0-9._-]{3,30}$/.test(u)||pw.length<8)throw Error('Username/password tidak memenuhi syarat.');if(publicUsers_().some(x=>x.username.toLowerCase()===u.toLowerCase()))throw Error('Username sudah ada.');const rr=['VIEWER','ADMIN'].includes(p.role)?p.role:'VIEWER';sheet_('Users').appendRow([u,hash_(pw),rr,true,new Date().toISOString()]);return {users:publicUsers_()}; }
  if (a==='setUserRole'||a==='setUserActive') { if(role!=='OWNER')throw Error('Hanya OWNER yang dapat mengatur role/status.');if(String(p.username).toLowerCase()==='owner')throw Error('Owner utama tidak dapat diubah.');const sh=sheet_('Users'),d=sh.getDataRange().getValues();const i=d.findIndex((r,n)=>n>0&&String(r[0])===String(p.username));if(i<1)throw Error('User tidak ditemukan.');if(a==='setUserRole')sh.getRange(i+1,3).setValue(['VIEWER','ADMIN'].includes(p.role)?p.role:'VIEWER');else sh.getRange(i+1,4).setValue(!!p.active);return {users:publicUsers_()}; }
  if (a==='createServiceRequest') {
    const service=String(p.service||'');
    if (!['VALETAX','JOKI_NEWS','TITIP_DANA'].includes(service)) throw Error('Jenis layanan tidak valid.');
    const sh=sheet_('Requests');
    const obj={id:'R'+Utilities.getUuid().replace(/-/g,'').slice(0,10),queueNo:'RSA-'+Utilities.getUuid().replace(/-/g,'').slice(0,6).toUpperCase(),username:sess.username,service:service,amount:Math.max(0,Number(p.amount||0)),mt5Id:clean_(p.mt5Id,100),mt5Server:clean_(p.mt5Server,120),status:'PENDING_PAYMENT',createdAt:new Date().toISOString()};
    putJson_('Requests',obj,sess.username); audit_(sess.username,'service_request',obj.id+' '+service); return {request:obj};
  }
  if (a==='getServiceData') return {requests:allUserJson_('Requests',sess.username,role),videos:allJson_('Videos'),valetax:allUserJson_('Valetax',sess.username,role)};
  if (a==='reviewServiceRequest') {
    requireEditor_(role);
    const obj=findJson_(p.id);if(!obj||!obj.service)throw Error('Permintaan tidak ditemukan.');
    const next=String(p.status||'');
    if (!['APPROVED','REJECTED','PENDING_PAYMENT','PENDING_REVIEW'].includes(next)) throw Error('Status tidak valid.');
    if (next==='APPROVED' && ['VALETAX','TITIP_DANA'].includes(obj.service) && !obj.proofUrl) throw Error('Belum ada bukti transfer. Periksa bukti sebelum approve.');
    obj.status=next;obj.reviewedAt=new Date().toISOString();obj.reviewedBy=sess.username;
    upsertJson_('Requests',obj,obj.username);audit_(sess.username,'review_request',obj.id+' '+next);return {request:obj};
  }
  if (a==='uploadPaymentProof') {
    const obj=findJson_(p.id);
    if(!obj||!obj.service|| (role!=='OWNER'&&role!=='ADMIN'&&obj.username!==sess.username))throw Error('Permintaan tidak ditemukan atau akses ditolak.');
    if (obj.status==='APPROVED'||obj.status==='REJECTED') throw Error('Permintaan sudah diputuskan dan tidak dapat diubah.');
    const name=clean_(p.fileName,160)||'bukti-transfer';
    const mime=String(p.mimeType||'').toLowerCase();
    const allowed=['image/jpeg','image/png','image/webp','application/pdf'];
    if(!allowed.includes(mime))throw Error('Format bukti harus JPG, PNG, WEBP, atau PDF.');
    const data=String(p.base64||'');
    if(!data||data.length>7000000)throw Error('File kosong atau terlalu besar. Maksimal sekitar 5 MB.');
    const match=data.match(/^data:[^;]+;base64,(.+)$/);if(!match)throw Error('Data file tidak valid. Pilih ulang bukti transfer.');
    const bytes=Utilities.base64Decode(match[1]);if(bytes.length>5*1024*1024)throw Error('Ukuran bukti maksimal 5 MB.');
    const props=PropertiesService.getScriptProperties();let folderId=props.getProperty('PAYMENT_PROOF_FOLDER_ID');
    let folder;if(folderId){try{folder=DriveApp.getFolderById(folderId)}catch(e){folder=null}}
    if(!folder){folder=DriveApp.createFolder('Raka Sang Analis - Bukti Pembayaran');props.setProperty('PAYMENT_PROOF_FOLDER_ID',folder.getId());}
    const safeName=name.replace(/[\\/:*?"<>|#%{}~&]/g,'_').slice(0,120);
    const blob=Utilities.newBlob(bytes,mime,safeName);const file=folder.createFile(blob);
    // Keep proof private; only the script owner/admin with Drive access can inspect it.
    obj.proofFileName=name;obj.proofFileId=file.getId();obj.proofUrl=file.getUrl();obj.proofUploadedAt=new Date().toISOString();obj.status='PENDING_REVIEW';obj.proofNote='Bukti tersimpan di Google Drive privat; verifikasi manual oleh Owner.';
    upsertJson_('Requests',obj,obj.username);audit_(sess.username,'payment_proof_uploaded',obj.id+' '+file.getId());return {request:obj};
  }
  if (a==='saveValetaxAccount') {
    requireEditor_(role);const req=findJson_(p.requestId);if(!req||!['VALETAX','TITIP_DANA'].includes(req.service))throw Error('Antrean layanan tidak ditemukan.');
    if(req.status!=='APPROVED')throw Error('Approve permintaan dan verifikasi pembayaran terlebih dahulu.');
    const accountId=clean_(p.accountId,120),accountPassword=String(p.accountPassword||'').slice(0,200),serverLocation=clean_(p.serverLocation,120);
    if(!accountId)throw Error('ID akun wajib diisi.');
    if(req.service==='VALETAX'&&!accountPassword)throw Error('Password akun Valetax wajib diisi.');
    const obj={id:req.id,requestId:req.id,queueNo:req.queueNo||req.id,username:req.username,service:req.service,accountId:accountId,accountPassword:req.service==='VALETAX'?accountPassword:'',serverLocation:serverLocation,issuedAt:new Date().toISOString()};
    upsertJson_('Valetax',obj,req.username);req.accountIssued=true;req.accountIssuedAt=new Date().toISOString();upsertJson_('Requests',req,req.username);audit_(sess.username,'service_account_issued',req.id+' '+req.service);
    return {valetax:allUserJson_('Valetax',sess.username,role)};
  }
  if (a==='saveTradingVideo') { requireEditor_(role);const obj={id:'V'+Utilities.getUuid().slice(0,8),title:clean_(p.title,160),youtubeUrl:String(p.youtubeUrl||'').slice(0,500)};putJson_('Videos',obj,'');return {videos:allJson_('Videos')}; }
  if (a==='updateLoginLocation') { audit_(sess.username,'location',JSON.stringify({gps:p.gps||null,ip:p.ip||''}).slice(0,300));return {}; }
  if (a==='saveJournal'||a==='getJournal'||a==='deleteJournal') {
    if(a==='saveJournal'){
      const input=p.journal||{};const sh=sheet_('Journal');const rows=sh.getDataRange().getValues();let id=String(input.id||'');
      if(id){const found=rows.find((r,i)=>i>0&&String(r[0])===id);if(found&&String(found[1])!==String(sess.username))throw Error('Catatan tidak ditemukan atau akses ditolak.');if(!found)id='';}
      const obj={id:id||Utilities.getUuid(),username:sess.username,date:clean_(input.date,20),symbol:clean_(input.symbol,30).toUpperCase(),side:['BUY','SELL'].includes(input.side)?input.side:'BUY',lot:Math.max(0,Number(input.lot)||0),entry:Math.max(0,Number(input.entry)||0),exit:Math.max(0,Number(input.exit)||0),sl:Math.max(0,Number(input.sl)||0),tp:Math.max(0,Number(input.tp)||0),pnl:Number(input.pnl)||0,setup:clean_(input.setup,300),emotion:clean_(input.emotion,80),notes:clean_(input.notes,3000),updatedAt:new Date().toISOString()};
      if(!obj.date||!obj.symbol)throw Error('Tanggal dan instrumen wajib diisi.');
      putJson_('Journal',obj,sess.username);audit_(sess.username,'save_journal',obj.id);return {journal:allUserJson_('Journal',sess.username,'VIEWER')};
    }
    if(a==='deleteJournal'){deleteRows_('Journal',r=>String(r[0])===String(p.id)&&String(r[1])===String(sess.username));audit_(sess.username,'delete_journal',String(p.id));return {journal:allUserJson_('Journal',sess.username,'VIEWER')};}
    return {journal:allUserJson_('Journal',sess.username,'VIEWER')};
  }
  throw Error('Aksi API belum didukung: '+a);
}

/** Live XAUUSD analysis: Twelve Data candles -> technical indicators -> Gemini explanation.
 * Configure Script Properties: TWELVE_DATA_API_KEY and GEMINI_API_KEY.
 */
function analyzeXauusd_(timeframe) {
  const allowed = {'5min':'5min','15min':'15min','30min':'30min','1h':'1h','4h':'4h','1day':'1day'};
  const interval = allowed[timeframe] || '1h';
  const props = PropertiesService.getScriptProperties();
  const cache = CacheService.getScriptCache();
  const analysisCacheKey = 'xau_ai_v2_' + interval;
  const cachedAnalysis = cache.get(analysisCacheKey);
  if (cachedAnalysis) { try { return JSON.parse(cachedAnalysis); } catch (e) {} }
  const marketKey = props.getProperty('TWELVE_DATA_API_KEY');
  const geminiKey = props.getProperty('GEMINI_API_KEY');
  if (!marketKey) throw Error('Script Property TWELVE_DATA_API_KEY belum diisi.');
  if (!geminiKey) throw Error('Script Property GEMINI_API_KEY belum diisi.');
  const candleCacheKey = 'xau_candles_v2_' + interval;
  let md = null;
  const cachedCandles = cache.get(candleCacheKey);
  if (cachedCandles) { try { md = JSON.parse(cachedCandles); } catch (e) {} }
  if (!md || !md.values || !md.values.length) {
    const url = 'https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=' + encodeURIComponent(interval) + '&outputsize=80&format=JSON&apikey=' + encodeURIComponent(marketKey);
    const mr = UrlFetchApp.fetch(url, {muteHttpExceptions:true});
    const mc = mr.getResponseCode();
    try { md = JSON.parse(mr.getContentText()); } catch(e) { throw Error('Respons penyedia data tidak valid.'); }
    if (mc < 200 || mc >= 300 || md.status === 'error' || !md.values || !md.values.length) {
      throw Error('Gagal mengambil candle XAUUSD: ' + String(md.message || md.code || ('HTTP '+mc)) + '. Pastikan paket Twelve Data mendukung simbol XAU/USD.');
    }
    try { cache.put(candleCacheKey, JSON.stringify(md), 20); } catch (e) {}
  }
  if (!md || md.status === 'error' || !md.values || !md.values.length) {
    throw Error('Gagal mengambil candle XAUUSD: ' + String((md && (md.message || md.code)) || 'data candle kosong') + '. Pastikan paket Twelve Data mendukung simbol XAU/USD.');
  }
  const candles = md.values.slice().reverse().map(v=>({time:v.datetime,open:Number(v.open),high:Number(v.high),low:Number(v.low),close:Number(v.close)})).filter(v=>Number.isFinite(v.close));
  if (candles.length < 55) throw Error('Candle valid kurang dari 55; indikator EMA belum cukup stabil.');
  const closes = candles.map(c=>c.close);
  const ema20 = emaLast_(closes,20), ema50 = emaLast_(closes,50), rsi = rsiLast_(closes,14);
  const recent = candles.slice(-30), highs=recent.map(c=>c.high).sort((a,b)=>a-b), lows=recent.map(c=>c.low).sort((a,b)=>a-b);
  const last = candles[candles.length-1];
  const levels = {R1:Math.max.apply(null,recent.slice(-10).map(c=>c.high)),R2:Math.max.apply(null,recent.map(c=>c.high)),S1:Math.min.apply(null,recent.slice(-10).map(c=>c.low)),S2:Math.min.apply(null,recent.map(c=>c.low))};
  const trend = last.close > ema20 && ema20 > ema50 ? 'bullish' : (last.close < ema20 && ema20 < ema50 ? 'bearish' : 'mixed');
  const confluence = Math.round(Math.min(100,Math.max(0,50 + (last.close>ema20?12:-12) + (ema20>ema50?12:-12) + (rsi>=55&&rsi<=70?10:rsi<45? -10:0))));
  const tech = {symbol:'XAU/USD',timeframe:interval,source:'Twelve Data',dataTime:last.time,price:last.close,ema20:ema20,ema50:ema50,rsi14:rsi,trend:trend,confluenceScore:confluence,levels:levels,candleCount:candles.length,latestCandles:candles.slice(-8)};
  const prompt = 'Kamu analis teknikal XAUUSD yang hati-hati. Analisis hanya berdasarkan JSON data candle dan indikator berikut; jangan mengarang berita atau data. Beri jawaban Bahasa Indonesia, sebutkan ketidakpastian, jangan menjanjikan profit. Data: '+JSON.stringify(tech)+'. Kembalikan JSON valid tanpa markdown dengan keys bias (BULLISH/BEARISH/NEUTRAL), confidenceScore (0-100, tingkat konfluensi bukan probabilitas profit), biasReason, summary, scenarios:{bull,bear,sideways}. Level teknikal yang diberikan berasal dari candle historis, bukan jaminan level berikutnya. Jika data campuran, bias NEUTRAL.';
  const gemUrl='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(geminiKey);
  const gr=UrlFetchApp.fetch(gemUrl,{method:'post',contentType:'application/json',payload:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.2,maxOutputTokens:700,responseMimeType:'application/json',thinkingConfig:{thinkingBudget:0}}}),muteHttpExceptions:true});
  const gc=gr.getResponseCode(); let gd; try{gd=JSON.parse(gr.getContentText())}catch(e){throw Error('Respons Gemini tidak valid.');}
  if(gc<200||gc>=300||gd.error) throw Error('Gemini API gagal: '+String(gd.error&&gd.error.message||'HTTP '+gc));
  const raw=gd.candidates&&gd.candidates[0]&&gd.candidates[0].content&&gd.candidates[0].content.parts&&gd.candidates[0].content.parts.map(x=>x.text||'').join('');
  if(!raw) throw Error('Gemini tidak mengembalikan hasil analisis.');
  let ai; try { ai=JSON.parse(raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')); } catch(e) { throw Error('Format hasil AI tidak terbaca. Coba analisis lagi.'); }
  const result = Object.assign({},tech,{bias:String(ai.bias||'NEUTRAL').toUpperCase(),confidenceScore:Number(ai.confidenceScore||confluence),biasReason:String(ai.biasReason||''),summary:String(ai.summary||''),scenarios:ai.scenarios||{}});
  try { cache.put(analysisCacheKey, JSON.stringify(result), 12); } catch (e) {}
  return result;
}
function emaLast_(values, period) { const k=2/(period+1); let e=values.slice(0,period).reduce((a,b)=>a+b,0)/period; for(let i=period;i<values.length;i++) e=values[i]*k+e*(1-k); return Number(e.toFixed(4)); }
function rsiLast_(values, period) { if(values.length<=period)return 50; let gain=0,loss=0; for(let i=1;i<=period;i++){const d=values[i]-values[i-1];if(d>=0)gain+=d;else loss-=d;} let ag=gain/period,al=loss/period; for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1];ag=(ag*(period-1)+Math.max(0,d))/period;al=(al*(period-1)+Math.max(0,-d))/period;} if(al===0)return 100; return Number((100-100/(1+ag/al)).toFixed(2)); }

function ss_(){const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw Error('Database belum dibuat. Jalankan setupNewSpreadsheet() terlebih dahulu.');return SpreadsheetApp.openById(id)}
function sheet_(n){const sh=ss_().getSheetByName(n);if(!sh)throw Error('Sheet '+n+' belum ada. Jalankan setupNewSpreadsheet().');return sh}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function hash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8).map(b=>(b+256)%256).map(b=>b.toString(16).padStart(2,'0')).join('')}
function clean_(s,n){return String(s||'').trim().slice(0,n)}
function auth_(token,required){if(!token){if(required)throw Error('Sesi tidak valid.');return null}const rows=sheet_('Sessions').getDataRange().getValues(),now=Date.now();const r=rows.slice(1).find(x=>String(x[0])===String(token)&&new Date(x[2]).getTime()>now);if(!r){if(required)throw Error('Sesi habis. Silakan login ulang.');return null}return {token:r[0],username:r[1]}}
function userRole_(u){const r=sheet_('Users').getDataRange().getValues().slice(1).find(x=>String(x[0])===String(u));return r?String(r[2]):''}
function requireEditor_(r){if(!['OWNER','ADMIN'].includes(r))throw Error('Akses ditolak.');}
function allSettings_(){const o={};sheet_('Settings').getDataRange().getValues().slice(1).forEach(r=>{if(r[0])o[r[0]]=r[1]});return o}
function getSetting_(k,d){const r=sheet_('Settings').getDataRange().getValues().slice(1).find(x=>String(x[0])===k);return r?String(r[1]):d}
function setSetting_(k,v){const sh=sheet_('Settings'),d=sh.getDataRange().getValues(),i=d.findIndex((r,n)=>n>0&&String(r[0])===k);if(i>0)sh.getRange(i+1,2).setValue(v);else sh.appendRow([k,v])}
function publicUsers_(){return sheet_('Users').getDataRange().getValues().slice(1).filter(r=>r[0]).map(r=>({username:r[0],role:r[2],active:r[3]!==false&&String(r[3]).toLowerCase()!=='false',createdAt:r[4]}))}
function allJson_(name){return sheet_(name).getDataRange().getValues().slice(1).filter(r=>r[2]).map(r=>{try{return JSON.parse(r[2])}catch(e){return null}}).filter(Boolean)}
function allUserJson_(name,u,role){return sheet_(name).getDataRange().getValues().slice(1).filter(r=>r[2]&&(['OWNER','ADMIN'].includes(role)||String(r[1])===String(u))).map(r=>{try{return JSON.parse(r[2])}catch(e){return null}}).filter(Boolean)}
function upsertJson_(name,obj,username){if(!obj||!obj.id)throw Error('Data tidak valid.');const sh=sheet_(name),d=sh.getDataRange().getValues(),i=d.findIndex((r,n)=>n>0&&String(r[0])===String(obj.id));const owner=username===undefined?(i>0?d[i][1]:''):username;const row=[String(obj.id),String(owner||''),JSON.stringify(obj),new Date().toISOString()];if(i>0)sh.getRange(i+1,1,1,row.length).setValues([row]);else sh.appendRow(row)}
function putJson_(name,obj,username){upsertJson_(name,obj,username)}
function findJson_(id){for(const name of ['Requests','Valetax','Journal','News','History','Videos']){const d=sheet_(name).getDataRange().getValues();const r=d.slice(1).find(x=>String(x[0])===String(id));if(r&&r[2]){try{const o=JSON.parse(r[2]);o.username=o.username||r[1];return o}catch(e){}}}return null}
function deleteRows_(name,pred){const sh=sheet_(name),d=sh.getDataRange().getValues();for(let i=d.length-1;i>=1;i--)if(pred(d[i]))sh.deleteRow(i+1)}
function audit_(u,a,d){try{sheet_('AuditLog').appendRow([new Date().toISOString(),u,a,String(d||'').slice(0,500)])}catch(e){}}
