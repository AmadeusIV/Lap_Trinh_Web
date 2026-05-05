const { ObjectId } = require('mongodb');

async function getBacSi(db, filters = {}) {
    let query = {};

    if (filters.chuyenKhoa && filters.chuyenKhoa !== '') {
        query.chuyenKhoa = filters.chuyenKhoa;
    }

    if (filters.minTuoi || filters.maxTuoi) {
        query.tuoi = {};
        if (filters.minTuoi) query.tuoi.$gte = parseInt(filters.minTuoi);
        if (filters.maxTuoi) query.tuoi.$lte = parseInt(filters.maxTuoi);
    }

    const result = await db.collection('BacSi').find(query).toArray();
    return result;
}

async function getBacSiById(db, id) {
    const collection = db.collection('BacSi');
    let query;
    if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
        query = { $or: [{ maBS: id }, { _id: new ObjectId(id) }] };
    } else {
        query = { maBS: id };
    }
    return await collection.findOne(query);
}

module.exports = { getBacSi, getBacSiById };
