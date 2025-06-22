# 🎨 PrepAlgo Color System & Design Guidelines

## Overview
Our color system is inspired by [Adobe Spectrum Design System](https://spectrum.adobe.com/page/color-system/) principles, providing accessible, professional, and visually appealing interfaces for both light and dark modes.

## 🎯 Recommendation Page Background Guidelines

### **Recommended Background Strategy**

Based on Spectrum's [using color](https://spectrum.adobe.com/page/using-color/) principles:

#### **Option 1: Clean Minimal (✅ Recommended)**
```jsx
// Use base background for clean, uncluttered look
background: theme.colors.background

// Benefits:
// ✅ Maximum focus on content
// ✅ Better card contrast  
// ✅ Professional appearance
// ✅ Follows Spectrum's "less is more" principle
```

#### **Option 2: Subtle Texture**
```jsx
// Very subtle background pattern or gradient
background: `
  radial-gradient(circle at 20% 50%, ${theme.colors.brand.primary}08 0%, transparent 50%),
  radial-gradient(circle at 80% 20%, ${theme.colors.brand.accent}05 0%, transparent 50%),
  ${theme.colors.background}
`
```

#### **Option 3: Section-Based Backgrounds**
```jsx
const RecommendationPageContainer = styled.div`
  background: ${({ theme }) => theme.colors.background};
  
  .hero-section {
    background: ${({ theme }) => theme.colors.backgroundSecondary};
  }
`
```

## 🏗️ Background Hierarchy

Following Adobe Spectrum's [color fundamentals](https://spectrum.adobe.com/page/color-fundamentals/):

### Light Mode
```
Base Layer (Page Background):     #ffffff
Secondary Layer (Cards):          #f8f9fa  
Tertiary Layer (Elevated):        #e9ecef
Interactive Layer (Hover):        #bed4e9
```

### Dark Mode  
```
Base Layer (Page Background):     #1a1a1a  (Spectrum Gray-100 equivalent)
Secondary Layer (Cards):          #2e2e2e  (Elevated surfaces)
Tertiary Layer (Navbar/Modals):   #2a2a2a  (Navigation surfaces)  
Interactive Layer (Hover):        #404040  (Spectrum Gray-400 equivalent)
```

## 🎯 **Final Recommendation**

**Use Option 1: Clean Minimal** (`theme.colors.background`) because:

1. **✅ Spectrum Compliance**: Follows Adobe's "content-first" philosophy
2. **✅ Maximum Readability**: Cards stand out clearly against clean background
3. **✅ Professional Look**: Clean, uncluttered appearance
4. **✅ Accessibility**: Excellent contrast ratios
5. **✅ Flexibility**: Works perfectly with our complementary color schemes
6. **✅ Performance**: No complex background rendering

The visual hierarchy is achieved through:
- **Card elevation** (background + border + shadow)
- **Typography hierarchy** (different text weights and colors)  
- **Color coding** (priority indicators, difficulty levels, strategy tags)
- **Interactive states** (hover effects, focus indicators)

## 📚 References
- [Adobe Spectrum Color System](https://spectrum.adobe.com/page/color-system/)
- [Adobe Spectrum Color Fundamentals](https://spectrum.adobe.com/page/color-fundamentals/)
- [Adobe Spectrum Using Color](https://spectrum.adobe.com/page/using-color/)
- [Adobe Spectrum Color Palette](https://spectrum.adobe.com/page/color-palette/)
