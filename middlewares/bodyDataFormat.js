
function formatBodyData (req, res, next) {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        // Chuyển đối tượng thành chuỗi JSON và sau đó chuyển lại thành đối tượng JavaScript
        req.body = JSON.parse(JSON.stringify(req.body));
        // chuyển đổi thành một mảng mới với key là 'contents'
        // req.body = { contents: [req.body] };
    }
    next();
}

module.exports = {formatBodyData} ;