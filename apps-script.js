// ============================================================
// PrintKasir Pro — Google Apps Script Backend
// Paste SELURUH kode ini ke Apps Script, lalu Deploy sebagai Web App
// ============================================================

var SPREADSHEET_ID = 'GANTI_DENGAN_ID_SPREADSHEET_KAMU';

// ── Sheet names ──
var SH_BARANG    = 'BARANG';
var SH_TRANSAKSI = 'TRANSAKSI';
var SH_USERS     = 'USERS';
var SH_VENDOR    = 'VENDOR_NOTA';

// ============================================================
// MAIN ROUTER — semua request masuk ke sini
// ============================================================
function doGet(e) {
  var action = e.parameter.action || '';
  var result;
  try {
    if      (action === 'getBarang')    result = getBarang();
    else if (action === 'getTransaksi') result = getTransaksi();
    else if (action === 'getUsers')     result = getUsers();
    else if (action === 'getVendor')    result = getVendorNota();
    else if (action === 'ping')         result = { status: 'ok', time: new Date().toISOString() };
    else result = { error: 'Action tidak dikenali: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  return jsonResponse(result);
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action || '';
  var result;
  try {
    if      (action === 'login')          result = login(body);
    else if (action === 'simpanTransaksi')result = simpanTransaksi(body);
    else if (action === 'simpanBarang')   result = simpanBarang(body);
    else if (action === 'hapusBarang')    result = hapusBarang(body);
    else if (action === 'simpanUser')     result = simpanUser(body);
    else if (action === 'simpanVendor')   result = simpanVendorNota(body);
    else if (action === 'tandaiLunas')    result = tandaiLunas(body);
    else if (action === 'lunasVendor')    result = lunasVendor(body);
    else result = { error: 'Action tidak dikenali: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  return jsonResponse(result);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

// ============================================================
// AUTH — LOGIN
// ============================================================
function login(body) {
  var username = (body.username || '').toLowerCase().trim();
  var password = (body.password || '').trim();
  var sh = getSheet(SH_USERS);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (r[0].toString().toLowerCase() === username && r[1].toString() === password && r[4] === true) {
      return { ok: true, user: { username: r[0], nama: r[2], role: r[3], wa: r[5] } };
    }
  }
  return { ok: false, error: 'Username atau password salah.' };
}

// ============================================================
// BARANG
// ============================================================
function getBarang() {
  var sh = getSheet(SH_BARANG);
  var rows = sh.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    // Parse tiers dari kolom JSON (kolom ke-7)
    var tiers = [];
    try { tiers = JSON.parse(r[6] || '[]'); } catch(e) { tiers = []; }
    result.push({
      kode: r[0], nama: r[1], satuan: r[2],
      kategori: r[3], modal: Number(r[4]), aktif: r[5],
      tiers: tiers
    });
  }
  return { ok: true, data: result };
}

function simpanBarang(body) {
  var sh = getSheet(SH_BARANG);
  var b = body.barang;
  // Cari baris existing by kode
  var rows = sh.getDataRange().getValues();
  var found = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === b.kode) { found = i + 1; break; }
  }
  var row = [b.kode, b.nama, b.satuan, b.kategori, b.modal, true, JSON.stringify(b.tiers)];
  if (found > 0) {
    sh.getRange(found, 1, 1, row.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }
  return { ok: true };
}

function hapusBarang(body) {
  var sh = getSheet(SH_BARANG);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === body.kode) {
      sh.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Barang tidak ditemukan.' };
}

// ============================================================
// TRANSAKSI
// ============================================================
function getTransaksi() {
  var sh = getSheet(SH_TRANSAKSI);
  var rows = sh.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    result.push({
      id: r[0], tgl: r[1], pelanggan: r[2], wa: r[3],
      kode: r[4], spek: r[5], qty: Number(r[6]),
      hargaPer: Number(r[7]), total: Number(r[8]), modal: Number(r[9]),
      bayar: r[10], order: r[11], kasir: r[12],
      deadline: r[13], tier: r[14]
    });
  }
  return { ok: true, data: result.reverse() };
}

function simpanTransaksi(body) {
  var sh = getSheet(SH_TRANSAKSI);
  var t = body.transaksi;
  var row = [
    t.id, t.tgl, t.pelanggan, t.wa,
    t.kode, t.spek, t.qty, t.hargaPer, t.total, t.modal,
    t.bayar, t.order, t.kasir, t.deadline, t.tier
  ];
  sh.appendRow(row);
  return { ok: true };
}

function tandaiLunas(body) {
  var sh = getSheet(SH_TRANSAKSI);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === body.id) {
      sh.getRange(i + 1, 11).setValue('Lunas');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Transaksi tidak ditemukan.' };
}

// ============================================================
// USERS
// ============================================================
function getUsers() {
  var sh = getSheet(SH_USERS);
  var rows = sh.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    result.push({ username: r[0], nama: r[2], role: r[3], aktif: r[4], wa: r[5] });
    // Password TIDAK dikirim ke client
  }
  return { ok: true, data: result };
}

function simpanUser(body) {
  var sh = getSheet(SH_USERS);
  var u = body.user;
  var rows = sh.getDataRange().getValues();
  var found = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === u.username) { found = i + 1; break; }
  }
  var row = [u.username, u.password, u.nama, u.role, u.aktif !== false, u.wa || ''];
  if (found > 0) {
    sh.getRange(found, 1, 1, row.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }
  return { ok: true };
}

// ============================================================
// VENDOR NOTA
// ============================================================
function getVendorNota() {
  var sh = getSheet(SH_VENDOR);
  var rows = sh.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    result.push({ id: r[0], tgl: r[1], vendor: r[2], total: Number(r[3]), status: r[4], link: r[5] || '' });
  }
  return { ok: true, data: result.reverse() };
}

function simpanVendorNota(body) {
  var sh = getSheet(SH_VENDOR);
  var v = body.vendor;
  sh.appendRow([v.id, v.tgl, v.vendor, v.total, v.status, v.link || '']);
  return { ok: true };
}

function lunasVendor(body) {
  var sh = getSheet(SH_VENDOR);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === body.id) {
      sh.getRange(i + 1, 5).setValue('Lunas');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Vendor nota tidak ditemukan.' };
}

// ============================================================
// SETUP — Jalankan SEKALI untuk buat sheet + header + data awal
// Buka Apps Script → Run → setupSheets
// ============================================================
function setupSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // USERS
  var shU = ss.getSheetByName(SH_USERS) || ss.insertSheet(SH_USERS);
  shU.getRange(1,1,1,6).setValues([['USERNAME','PASSWORD','NAMA','ROLE','AKTIF','WA']]);
  shU.getRange(1,1,1,6).setFontWeight('bold').setBackground('#1D4ED8').setFontColor('#ffffff');
  if (shU.getLastRow() < 2) {
    shU.appendRow(['boss',   '1234','Boss Sistem', 'boss',  true,  '08111111111']);
    shU.appendRow(['admin',  '1234','Admin Toko',  'admin', true,  '08222222222']);
    shU.appendRow(['kasir',  '1234','Andi Pratama','kasir', true,  '08333333333']);
  }

  // BARANG
  var shB = ss.getSheetByName(SH_BARANG) || ss.insertSheet(SH_BARANG);
  shB.getRange(1,1,1,7).setValues([['KODE','NAMA','SATUAN','KATEGORI','MODAL','AKTIF','TIERS_JSON']]);
  shB.getRange(1,1,1,7).setFontWeight('bold').setBackground('#059669').setFontColor('#ffffff');
  if (shB.getLastRow() < 2) {
    shB.appendRow(['ap', 'Art Paper', 'lembar','Cetak Digital',300,true,
      JSON.stringify([{max:50,h:1000},{max:100,h:800},{max:200,h:650},{max:9999,h:500}])]);
    shB.appendRow(['brs','Brosur A5','lembar','Cetak Digital',200,true,
      JSON.stringify([{max:100,h:500},{max:300,h:400},{max:500,h:320},{max:9999,h:250}])]);
    shB.appendRow(['bn', 'Banner',   'pcs',  'Banner',     90000,true,
      JSON.stringify([{max:1,h:150000},{max:5,h:135000},{max:9999,h:120000}])]);
    shB.appendRow(['knm','Kartu Nama','pcs', 'Kartu',      150,true,
      JSON.stringify([{max:50,h:400},{max:100,h:300},{max:200,h:220},{max:9999,h:180}])]);
    shB.appendRow(['idc','ID Card',  'pcs',  'Kartu',      5000,true,
      JSON.stringify([{max:25,h:12000},{max:50,h:9000},{max:100,h:7500},{max:9999,h:6000}])]);
    shB.appendRow(['sp', 'Spanduk',  'pcs',  'Banner',     120000,true,
      JSON.stringify([{max:1,h:200000},{max:3,h:185000},{max:9999,h:170000}])]);
  }

  // TRANSAKSI
  var shT = ss.getSheetByName(SH_TRANSAKSI) || ss.insertSheet(SH_TRANSAKSI);
  shT.getRange(1,1,1,15).setValues([['ID','TANGGAL','PELANGGAN','WA','KODE','SPEK','QTY','HARGA_PER','TOTAL','MODAL','STATUS_BAYAR','STATUS_ORDER','KASIR','DEADLINE','TIER']]);
  shT.getRange(1,1,1,15).setFontWeight('bold').setBackground('#374151').setFontColor('#ffffff');

  // VENDOR_NOTA
  var shV = ss.getSheetByName(SH_VENDOR) || ss.insertSheet(SH_VENDOR);
  shV.getRange(1,1,1,6).setValues([['ID','TANGGAL','VENDOR','TOTAL','STATUS','LINK_FOTO']]);
  shV.getRange(1,1,1,6).setFontWeight('bold').setBackground('#D97706').setFontColor('#ffffff');

  SpreadsheetApp.flush();
  Logger.log('Setup selesai! Semua sheet sudah dibuat.');
}
