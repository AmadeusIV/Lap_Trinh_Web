const express = require('express');
const path = require('path');
const { connectDatabase } = require('./db/connection');
const { getBacSi, getBacSiById } = require('./db/bacSi');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'home.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'about.html'));
});

app.get('/doctors', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'danhSach.html'));
});

app.get('/search-keyword', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'timKiemTuKhoa.html'));
});

app.get('/search-specialty', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'timKiemChuyenKhoa.html'));
});

app.get('/search-age', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'timKiemDoTuoi.html'));
});

app.get('/admin/add', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'adminAdd.html'));
});

app.get('/admin/edit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'adminEdit.html'));
});

app.get('/admin/delete', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'adminDelete.html'));
});

app.get('/doctors-detail', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'danhSachChiTiet.html'));
});

const fs = require('fs');
app.get('/api/images', (req, res) => {
    const imagesDir = path.join(__dirname, 'public', 'images');
    const files = fs.readdirSync(imagesDir).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
    res.json(files);
});

app.get('/api/bacsi', async (req, res) => {
    try {
        const db = await connectDatabase();
        const danhSach = await getBacSi(db);
        res.json({
            tongSo: danhSach.length,
            danhSach: danhSach
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/bacsi/chuyenkhoa/:khoa', async (req, res) => {
    try {
        const khoa = decodeURIComponent(req.params.khoa);
        const db = await connectDatabase();
        const danhSach = await db.collection('BacSi').find({ "chuyenKhoa": { $regex: new RegExp(`^${khoa}$`, 'i') } }).toArray();
        res.json({ tongSo: danhSach.length, danhSach });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/bacsi/tuoi/:min/:max', async (req, res) => {
    try {
        const min = parseInt(req.params.min);
        const max = parseInt(req.params.max);
        const db = await connectDatabase();
        const danhSach = await db.collection('BacSi').find({ "tuoi": { $gte: min, $lte: max } }).toArray();
        res.json({ tongSo: danhSach.length, danhSach });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/bacsi/search', async (req, res) => {
    try {
        const keyword = req.query.keyword || '';
        const db = await connectDatabase();
        const tatCa = await db.collection('BacSi').find({}).toArray();

        const normalize = (str) =>
            (str || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D')
                .toLowerCase();

        const kw = normalize(keyword);

        const danhSach = keyword ? tatCa.filter(bs =>
            normalize(bs.chuyenKhoa).includes(kw) ||
            normalize(bs.diaChi?.quan).includes(kw) ||
            normalize(bs.diaChi?.thanhPho).includes(kw) ||
            (bs.ngayLamViec || []).some(n => normalize(n).includes(kw))
        ) : tatCa;

        res.json({ tongSo: danhSach.length, danhSach });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/bacsi/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const db = await connectDatabase();

        const bacSi = await getBacSiById(db, id);

        if (bacSi) {
            res.json(bacSi);
        } else {
            res.status(404).json({ success: false, message: 'Không tìm thấy bác sĩ' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/bacsi', async (req, res) => {
    try {
        const db = await connectDatabase();
        const data = req.body;

        const count = await db.collection('BacSi').countDocuments();
        const newId = `BS${String(count + 1).padStart(4, '0')}`;
        data.maBS = newId;

        const result = await db.collection('BacSi').insertOne(data);
        res.json({ success: true, message: 'Thêm mới bác sĩ thành công', id: newId, result: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/bacsi/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const db = await connectDatabase();
        const data = req.body;
        delete data._id;

        const result = await db.collection('BacSi').updateOne({ maBS: id }, { $set: data });
        if (result.matchedCount === 0) {
            const { ObjectId } = require('mongodb');
            if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
                const res2 = await db.collection('BacSi').updateOne({ _id: new ObjectId(id) }, { $set: data });
                if (res2.matchedCount > 0) return res.json({ success: true, message: 'Cập nhật thành công' });
            }
            return res.status(404).json({ success: false, message: 'Không tìm ra bác sĩ để cập nhật' });
        }
        res.json({ success: true, message: 'Chỉnh sửa thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/bacsi/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const db = await connectDatabase();

        let result = await db.collection('BacSi').deleteOne({ maBS: id });
        if (result.deletedCount === 0) {
            const { ObjectId } = require('mongodb');
            if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
                result = await db.collection('BacSi').deleteOne({ _id: new ObjectId(id) });
            }
        }

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bác sĩ để xóa' });
        }
        res.json({ success: true, message: 'Đã xóa bác sĩ vĩnh viễn' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server chạy tại: http://localhost:${PORT}`);
});