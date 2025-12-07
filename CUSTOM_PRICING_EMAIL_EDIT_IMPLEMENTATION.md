# Custom Pricing Email Edit Implementation

## Overview
This document describes the implementation of the feature that allows vendors to edit the custom pricing email that was set up during tool creation.

## Feature Description
Vendors can now change the custom pricing contact email for their tools through the tool edit page. This email is used when users want to inquire about custom pricing plans for the tool.

## Implementation Details

### File Modified
- `src/app/vendor-dashboard/tools/[id]/edit/page.tsx`

### Changes Made

#### 1. State Management
Added a new state variable to manage the custom pricing email:
```typescript
const [customPricingEmail, setCustomPricingEmail] = useState('');
```

#### 2. Original Data Tracking
Extended the `originalData` state to include the custom pricing email for change detection:
```typescript
const [originalData, setOriginalData] = useState({
  // ... other fields
  customPricingEmail: ''
});
```

#### 3. Change Detection
Updated the `useEffect` hook to detect changes in the custom pricing email:
```typescript
useEffect(() => {
  const changed =
    // ... other field checks
    customPricingEmail !== originalData.customPricingEmail;
  setHasChanges(changed);
}, [formData, imageFile, uiMetadata, contentMetadata, customPricingEmail, originalData]);
```

#### 4. Data Loading
Added logic to load the existing custom pricing email from the tool's metadata:
```typescript
// Get custom pricing email from metadata
const initialCustomPricingEmail = (metadata.custom_pricing_email as string) || '';
setCustomPricingEmail(initialCustomPricingEmail);
```

#### 5. Data Saving
Updated the metadata structure when saving to include the custom pricing email:
```typescript
const updatedMetadata = {
  ...currentMetadata,
  ui: { /* ... */ },
  content: { /* ... */ },
  custom_pricing_email: customPricingEmail || undefined
};
```

#### 6. UI Component
Added a new form field in the "Basic Information" section:
- Email input field with validation (type="email")
- Label with helpful tooltip explaining the purpose
- Help text below the input
- Placeholder text: "contact@yourcompany.com"

### UI Location
The custom pricing email field is located in the "Basic Information" section of the tool edit page, positioned after the "Long Description" markdown editor and before the "UI Metadata" section.

### User Flow
1. Vendor navigates to the tool edit page (`/vendor-dashboard/tools/[id]/edit`)
2. The existing custom pricing email (if any) is automatically loaded into the field
3. Vendor can modify or add a custom pricing email
4. Changes are tracked and the "Save Changes" button becomes enabled
5. When "Save Changes" is clicked, the email is saved to the tool's metadata
6. The updated email will be used for custom pricing inquiries

### Data Storage
The custom pricing email is stored in the `metadata` JSONB column of the `tools` table:
```json
{
  "ui": { /* ... */ },
  "content": { /* ... */ },
  "custom_pricing_email": "contact@vendor.com"
}
```

### Integration with Existing Features
The custom pricing email integrates with:
- **Product Custom Plans**: Used as a fallback email when products don't have their own contact email
- **PricingDisplay Component**: Shows this email in the "Contact for Custom Pricing" section
- **Tool Creation Flow**: Already supported during initial tool creation in the publish page

### Validation
- Email format validation is handled by the HTML5 email input type
- Optional field (can be left empty)
- Empty values are not saved to the metadata (undefined values are removed)

## Testing Recommendations

### Manual Testing Steps
1. **Load Existing Tool with Email**:
   - Navigate to a tool edit page for a tool with an existing custom pricing email
   - Verify the email field is populated correctly

2. **Load Tool without Email**:
   - Navigate to a tool edit page for a tool without a custom pricing email
   - Verify the field is empty

3. **Edit Email**:
   - Change the email address
   - Verify the "Save Changes" button becomes enabled
   - Save the changes
   - Reload the page and verify the new email is displayed

4. **Remove Email**:
   - Clear the email field
   - Save the changes
   - Verify the email is removed from the metadata

5. **Validation**:
   - Try entering an invalid email format
   - Verify browser validation works

6. **Integration Test**:
   - Create a custom plan product without a contact email
   - Verify the tool's custom pricing email is used as fallback in the pricing display

## Benefits
- Vendors can update their contact information without recreating the tool
- Flexibility to change contact methods as business needs evolve
- Consistent with the email management for products
- Clean, intuitive UI with helpful tooltips

## Future Enhancements
- Email verification system
- Multiple contact emails support
- Auto-populate from vendor profile
- Email templates for custom pricing inquiries

