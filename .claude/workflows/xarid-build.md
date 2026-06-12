# XARID Multi-Agent Build Workflow

You are orchestrating a comprehensive product development workflow for XARID - a modern procurement marketplace for restaurants, cafes, and chaikhanas.

The workflow will involve 5 specialized agents working in parallel and sequence to build out the complete platform.

---

## Agent 1: UI/UX Research & Design Direction

**Task:** Research and establish immersive, 3D-forward UI/UX design system for XARID

**Specific Instructions:**
- Research modern 3D design patterns in food-tech and logistics apps
- Analyze: Yandex Go, Grab, Choco (Kazakhstan), REKKI interfaces
- Create design system with:
  - 3D card components for products/suppliers
  - Immersive scrolling experiences
  - Interactive 3D visualizations for orders
  - Glassmorphism and depth effects
  - Mobile-first, then desktop scaling
- Define color palette appropriate for Uzbekistan market (food/trust/speed)
- Create Figma component library structure (deliverable: wireframes + design tokens)
- Recommend tech stack: Framer, Three.js, Spline for 3D elements

**Output:** Design system document + component specifications

---

## Agent 2: Account Architecture & Role Design

**Task:** Design dual-account ecosystem with clear separation of concerns

**Account Types:**

### Account Type A: CUSTOMER (Restaurant/Cafe/Chaikhana/Market Owner)
- Primary users: Restaurant owners, cafe managers, kitchen heads
- Core action: Place daily supply orders
- Features: Order history, favorites, pricing, delivery tracking

### Account Type B: SUPPLIER/DELIVERY (Product Seller)
- Primary users: Food distributors, wholesalers, product vendors
- Core action: Manage product catalog, fulfill orders, track sales
- Features: Analytics dashboard, product management, company profile, income tracking

**Output:** Account architecture document with user flows, data models, and role permissions

---

## Agent 3: CUSTOMER ACCOUNT DESIGN & IMPLEMENTATION

**Task:** Design and build the customer-facing interface for restaurants/cafes/market owners

**Design Requirements:**
- Immersive 3D product browsing (vegetables, meat, dairy, dry goods)
- One-basket ordering across multiple suppliers
- Price transparency and comparison
- Order history with reorder shortcuts
- Favorites/watchlist functionality
- Delivery tracking with ETA
- Push notifications for order status
- Support for 3 languages: Uzbek, Russian, English
- Mobile-optimized (primary interface)
- Quick reorder from templates (morning routine orders)

**Technical Implementation:**
- Build React components with 3D elements (Three.js integration)
- Create order management state
- Integrate payment gateway (Paynet for Uzbekistan)
- Set up push notification system
- Implement language switching

**Output:** Working customer account interface + component library

---

## Agent 4: SUPPLIER/DELIVERY ACCOUNT DESIGN & ANALYTICS DASHBOARD

**Task:** Build comprehensive supplier portal with analytics and product management

**Core Sections:**

### 1. Analytics Dashboard
- **Sales Overview:**
  - Total products sold (number + revenue)
  - Top-selling products (ranked list)
  - Sales by category (pie chart)
  
- **Revenue Tracking:**
  - Daily/weekly/monthly income (line graph)
  - Revenue breakdown by product (pie chart with percentages)
  - Profit margins visualization
  - Pending vs completed payments
  
- **Customer Insights:**
  - Number of active customers
  - Repeat order rate
  - Average order value

### 2. Company Profile Management
- Company name, description, logo upload
- Location/coverage area
- Business hours
- Contact information
- Bank details for payouts
- Company verification status

### 3. Product Management
- Add/edit/delete products
- Product images (multi-image upload with 3D preview)
- Price management
- Inventory tracking
- Product categories
- Batch product upload (CSV import)
- Product analytics (views, orders, conversion rate)

### 4. Order Management
- View incoming orders in real-time
- Accept/reject orders
- Delivery scheduling
- Packing status tracking
- Customer communication

**Design Style:** 
- Professional, data-heavy dashboard
- Dark mode by default (for long working hours)
- Clear data visualization
- Responsive grid layout

**Tech Stack:**
- React + TypeScript
- Recharts for analytics (line charts, pie charts)
- Image upload with compression
- CSV parser for bulk imports
- Real-time updates (WebSocket or polling)

**Output:** Complete supplier dashboard + analytics system

---

## Agent 5: LOGISTICS SYSTEM (XARID GO)

**Task:** Build in-house logistics platform similar to Yandex Go but optimized for B2B food delivery

**Core Features:**

### Map & Route Optimization
- Real-time map interface (Mapbox or Leaflet)
- Multi-stop route optimization for consolidated deliveries
- Driver location tracking
- Estimated delivery times with traffic

### Delivery Management
- Assign orders to delivery partners
- Create optimal delivery routes (consolidate multiple restaurant orders)
- Live tracking for customers
- Proof of delivery (photos, signatures)
- Delivery rating system

### Driver/Delivery Partner App
- Accept/reject delivery jobs
- Navigation with turn-by-turn directions
- Order checklist (confirm items before delivery)
- Chat with customer
- Earnings summary
- Rating/reputation system

### Logistics Analytics
- Delivery success rate
- Average delivery time
- Cost per delivery
- Peak delivery hours
- Driver performance metrics

### Pricing Model
- Base delivery fee
- Distance-based pricing
- Consolidated delivery discount (multiple restaurants = cheaper)
- Peak hour surcharge

**Design Inspiration:**
- Yandex Go: clean map interface, real-time tracking
- But simplified for B2B (fewer emotional moments, more data)
- Dark theme for drivers (similar to Yandex)
- Large touch targets for in-vehicle use

**Tech Stack:**
- Mapbox API for maps
- Node.js backend for route optimization
- WebSocket for real-time location updates
- React Native or Flutter for driver app
- Redis for caching routes and driver locations

**Output:** Complete logistics system with map interface, driver app, and analytics

---

## Workflow Execution Plan

### Phase 1: Parallel Research (Agents 1-2)
- Agent 1 completes design system research
- Agent 2 defines account architecture
- **Duration:** 2-3 hours

### Phase 2: Parallel Implementation (Agents 3-4)
- Agent 3 builds customer interface
- Agent 4 builds supplier dashboard
- Both use Agent 1's design system
- **Duration:** 8-12 hours

### Phase 3: Logistics Development (Agent 5)
- Agent 5 integrates with Agents 3-4 systems
- Creates driver app
- Sets up real-time tracking
- **Duration:** 6-8 hours

### Phase 4: Integration & Testing
- All agents verify integration points
- User testing on customer + supplier flows
- Edge case handling

---

## Success Criteria

✅ Customer can browse 3D products and place order in < 2 minutes
✅ Supplier can see real-time sales and analytics
✅ Supplier can upload 100+ products with images
✅ Delivery tracking works in real-time with < 2 second latency
✅ All interfaces support Uzbek/Russian/English
✅ Mobile-first, responsive to desktop
✅ 3D elements enhance UX without sacrificing performance

---

## Important Notes for All Agents

1. **Design Consistency:** All agents must reference Agent 1's design system
2. **Data Models:** Coordinate with Agent 2's account architecture
3. **API Integration:** Plan backend endpoints that support all features
4. **Performance:** 3D elements must not impact mobile load times (lazy load)
5. **Localization:** Every string must support 3-language system
6. **Testing:** Include unit tests for critical paths

---

## File Structure to Create

```
xarid-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── 3d/          (Agent 1)
│   │   │   ├── customer/    (Agent 3)
│   │   │   ├── supplier/    (Agent 4)
│   │   │   └── logistics/   (Agent 5)
│   │   ├── pages/
│   │   ├── styles/          (Design tokens from Agent 1)
│   │   └── utils/
│   └── package.json
├── backend/
│   ├── routes/
│   │   ├── customer/
│   │   ├── supplier/
│   │   └── logistics/
│   ├── models/
│   ├── services/
│   └── config/
└── mobile/
    └── (Driver app - Agent 5)
```

---

## Ready to Execute

Run each agent in sequence with proper handoffs:
1. Agent 1 → Design System Ready
2. Agent 2 → Architecture Ready
3. Agent 3 & 4 → Parallel Implementation
4. Agent 5 → Logistics Integration
5. Integration & Polish
