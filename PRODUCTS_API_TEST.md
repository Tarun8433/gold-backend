# Products API - Test Documentation

## Base URL
```
http://192.168.29.13:5001/api/products
```

## Authentication
Most POST, PUT, DELETE operations require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### 1. Get All Products (with Pagination & Filters)
**GET** `/api/products`

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10)
- `category` (string) - Filter by category
- `material` (string) - Filter by material
- `minPrice` (number) - Minimum price
- `maxPrice` (number) - Maximum price
- `minRating` (number) - Minimum rating
- `inStock` (boolean) - Show only in-stock items
- `sortBy` (string) - Sort options: `price_asc`, `price_desc`, `rating`, `newest`, `popular`

**Examples:**
```bash
# Get all products
curl http://localhost:5001/api/products

# Get products with pagination
curl "http://localhost:5001/api/products?page=1&limit=10"

# Filter by category
curl "http://localhost:5001/api/products?category=Rings"

# Filter by price range
curl "http://localhost:5001/api/products?minPrice=100&maxPrice=1000"

# Sort by price (ascending)
curl "http://localhost:5001/api/products?sortBy=price_asc"

# Multiple filters
curl "http://localhost:5001/api/products?category=Necklaces&material=Gold&maxPrice=500&sortBy=price_desc"
```

**Response:**
```json
{
  "products": [...],
  "page": 1,
  "pages": 5,
  "total": 50,
  "limit": 10
}
```

---

### 2. Get Product by ID
**GET** `/api/products/:id`

**Example:**
```bash
curl http://localhost:5001/api/products/69653b309866146f8497391a
```

**Response:**
```json
{
  "_id": "69653b309866146f8497391a",
  "name": "Diamond Solitaire Ring",
  "description": "Elegant diamond solitaire ring...",
  "price": 1299,
  "originalPrice": 1599,
  "images": ["https://picsum.photos/400?1"],
  "category": "Rings",
  "material": "Diamond",
  "weight": 5.2,
  "sizes": ["5.0", "5.5", "6.0", "6.5", "7.0"],
  "stock": 10,
  "rating": 0,
  "numReviews": 0,
  "reviews": [],
  "isFeatured": true,
  "isNewArrival": true,
  "isBestSeller": false,
  "tags": ["diamond", "engagement", "luxury"],
  "soldCount": 0,
  "viewCount": 1,
  "createdAt": "2026-01-12T18:19:28.474Z",
  "updatedAt": "2026-01-12T18:19:28.474Z"
}
```

---

### 3. Create Product (Admin)
**POST** `/api/products`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Product Name",
  "description": "Product description (min 10 chars)",
  "price": 999.99,
  "originalPrice": 1199.99,
  "images": ["https://example.com/image1.jpg"],
  "category": "Rings",
  "material": "Gold",
  "weight": 5.5,
  "sizes": ["6.0", "7.0", "8.0"],
  "stock": 20,
  "isFeatured": false,
  "isNewArrival": true,
  "isBestSeller": false,
  "tags": ["gold", "ring", "elegant"]
}
```

**Valid Categories:**
- Necklaces, Earrings, Rings, Bracelets, Mens, Watches, Pendants, Brooches, Anklets, Charms, Sets, Others

**Valid Materials:**
- Gold, Silver, Platinum, Diamond, Pearl, Gemstone, Mixed

**Example:**
```bash
curl -X POST http://localhost:5001/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Gold Ring",
    "description": "Beautiful gold ring",
    "price": 599.00,
    "images": ["https://picsum.photos/400?4"],
    "category": "Rings",
    "material": "Gold",
    "stock": 10
  }'
```

---

### 4. Update Product (Admin)
**PUT** `/api/products/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:** (All fields optional)
```json
{
  "name": "Updated Product Name",
  "price": 899.99,
  "stock": 15,
  "isFeatured": true
}
```

**Example:**
```bash
curl -X PUT http://localhost:5001/api/products/69653b309866146f8497391a \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "stock": 5,
    "isBestSeller": true
  }'
```

---

### 5. Delete Product (Admin)
**DELETE** `/api/products/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Example:**
```bash
curl -X DELETE http://localhost:5001/api/products/69653b309866146f8497391a \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "message": "Product removed"
}
```

---

### 6. Search Products
**GET** `/api/products/search`

**Query Parameters:**
- `q` (string, required) - Search query
- `page` (number) - Page number
- `limit` (number) - Items per page

**Example:**
```bash
# Search for "diamond"
curl "http://localhost:5001/api/products/search?q=diamond"

# Search with pagination
curl "http://localhost:5001/api/products/search?q=gold&page=1&limit=5"
```

**Response:**
```json
{
  "products": [...],
  "page": 1,
  "pages": 2,
  "total": 12,
  "query": "diamond"
}
```

---

### 7. Get Featured Products
**GET** `/api/products/featured`

**Query Parameters:**
- `limit` (number) - Maximum items to return (default: 10)

**Example:**
```bash
curl "http://localhost:5001/api/products/featured?limit=5"
```

---

### 8. Get New Arrivals
**GET** `/api/products/new-arrivals`

**Query Parameters:**
- `limit` (number) - Maximum items to return (default: 10)

**Example:**
```bash
curl "http://localhost:5001/api/products/new-arrivals?limit=10"
```

---

### 9. Get Best Sellers
**GET** `/api/products/best-sellers`

**Query Parameters:**
- `limit` (number) - Maximum items to return (default: 10)

**Example:**
```bash
curl "http://localhost:5001/api/products/best-sellers?limit=5"
```

---

### 10. Get Recommendations
**GET** `/api/products/recommendations`

**Query Parameters:**
- `limit` (number) - Maximum items to return (default: 10)

**Example:**
```bash
curl "http://localhost:5001/api/products/recommendations?limit=10"
```

**Note:** Current implementation returns products sorted by rating and sold count. In production, implement a more sophisticated recommendation algorithm based on user preferences and browsing history.

---

## Testing the APIs

### Step 1: Get Authentication Token

```bash
# Register a new user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `token` from the response.

### Step 2: Create Sample Products

```bash
TOKEN="your_token_here"

# Create Product 1
curl -X POST http://localhost:5001/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Diamond Solitaire Ring",
    "description": "Elegant diamond solitaire ring crafted in 18K white gold",
    "price": 1299.00,
    "originalPrice": 1599.00,
    "images": ["https://picsum.photos/400?1"],
    "category": "Rings",
    "material": "Diamond",
    "weight": 5.2,
    "sizes": ["5.0", "5.5", "6.0", "6.5", "7.0"],
    "stock": 10,
    "isFeatured": true,
    "isNewArrival": true,
    "tags": ["diamond", "engagement", "luxury"]
  }'

# Create Product 2
curl -X POST http://localhost:5001/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Gold Plated Necklace",
    "description": "Beautiful gold plated necklace with intricate design",
    "price": 349.00,
    "images": ["https://picsum.photos/400?2"],
    "category": "Necklaces",
    "material": "Gold",
    "stock": 15,
    "isBestSeller": true,
    "tags": ["gold", "necklace"]
  }'
```

### Step 3: Test Various Endpoints

```bash
# Get all products
curl http://localhost:5001/api/products

# Get featured products
curl http://localhost:5001/api/products/featured

# Get new arrivals
curl http://localhost:5001/api/products/new-arrivals

# Search for products
curl "http://localhost:5001/api/products/search?q=gold"

# Filter by category and price
curl "http://localhost:5001/api/products?category=Rings&maxPrice=1500"
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "message": "Not authorized, no token"
}
```

### 404 Not Found
```json
{
  "message": "Product not found"
}
```

### 500 Server Error
```json
{
  "message": "Server Error"
}
```

---

## Product Schema

```javascript
{
  name: String (required),
  description: String (required),
  price: Number (required, min: 0),
  originalPrice: Number (optional, min: 0),
  images: [String] (required, at least 1),
  category: String (enum, required),
  material: String (enum, optional),
  weight: Number (optional, in grams),
  sizes: [String] (optional),
  stock: Number (required, default: 0),
  rating: Number (default: 0, range: 0-5),
  numReviews: Number (default: 0),
  reviews: [Review],
  isFeatured: Boolean (default: false),
  isNewArrival: Boolean (default: false),
  isBestSeller: Boolean (default: false),
  tags: [String],
  soldCount: Number (default: 0),
  viewCount: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Notes

1. **Admin Routes**: Currently, create/update/delete routes require authentication but don't check for admin role. Implement admin middleware for production.

2. **Text Search**: The search endpoint uses MongoDB text index. Make sure the database has the text index created:
   ```javascript
   ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
   ```

3. **View Count**: The product's view count increments each time the product details are fetched.

4. **Recommendations**: The current recommendation algorithm is simple. Consider implementing a more sophisticated approach based on:
   - User browsing history
   - User preferences
   - Collaborative filtering
   - Content-based filtering

5. **Performance**: For large datasets, consider:
   - Adding more indexes
   - Implementing caching (Redis)
   - Using aggregation pipelines for complex queries

---

## Next Steps

1. Implement admin middleware to protect admin-only routes
2. Add product reviews functionality
3. Add product image upload
4. Implement wishlist functionality
5. Add inventory management
6. Implement advanced recommendation engine
7. Add product analytics (views, clicks, conversions)
