const fs = require('fs');
const path = require('path');

const adminDir = path.resolve('d:/SLIIT/Year 2 Semester 2/ITP/project new updated/e-com-itp-main/e-com-itp-main/frontend/src/pages/admin');
const productDir = path.join(adminDir, 'product');
const supplierDir = path.join(adminDir, 'supplier');

fs.mkdirSync(productDir, { recursive: true });
fs.mkdirSync(supplierDir, { recursive: true });

const moves = [
    { fileName: 'SuppliersPage.jsx', targetDir: supplierDir },
    { fileName: 'ProductsPage.jsx', targetDir: productDir },
    { fileName: 'CategoriesPage.jsx', targetDir: productDir },
    { fileName: 'BarcodePrintPage.jsx', targetDir: productDir },
];

moves.forEach(({ fileName, targetDir }) => {
    const oldPath = path.join(adminDir, fileName);
    const newPath = path.join(targetDir, fileName);

    if (fs.existsSync(oldPath)) {
        let content = fs.readFileSync(oldPath, 'utf8');
        // Bump all relative imports exactly one directory deeper
        content = content.replace(/\.\.\/\.\.\//g, '../../../');
        // If there were any imports expecting files strictly in `admin` (e.g. "../someAdminSibling"), bump them to "../../"
        // Though usually it's just the Layout, hook, etc.
        fs.writeFileSync(newPath, content);
        fs.unlinkSync(oldPath);
        console.log(`Moved and patched ${fileName}`);
    } else {
        console.log(`${fileName} not found at ${oldPath}`);
    }
});
