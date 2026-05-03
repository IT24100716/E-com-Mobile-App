const axios = require('axios');

async function testFetchProducts() {
    try {
        const response = await axios.get('http://192.168.8.134:5001/api/v1/products?skip=0&take=10');
        console.log('Response Status:', response.status);
        console.log('Response Data Type:', typeof response.data);
        console.log('Response Data Keys:', Object.keys(response.data));
        if (response.data.data) {
            console.log('Data Keys:', Object.keys(response.data.data));
            if (response.data.data.products) {
                console.log('Products Count:', response.data.data.products.length);
            }
        }
    } catch (error) {
        console.error('Error fetching products:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data));
        }
    }
}

testFetchProducts();
