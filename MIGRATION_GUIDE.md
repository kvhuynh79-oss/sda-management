# Session-Based Authentication Migration Guide

## ✅ Completed

### Core Infrastructure
- ✅ **Backend**: Sessions table, loginWithSession, validateSession, refreshSession (W2 completed)
- ✅ **useSession hook**: Token validation with Convex query
- ✅ **auth utility library**: Token refresh, logout, authentication checks
- ✅ **RequireAuth component**: Updated to use sessions
- ✅ **Header component**: Migrated from localStorage to useSession
- ✅ **Login page**: Uses loginWithSession and stores tokens

### Build Status
- ✅ **TypeScript**: No errors
- ✅ **Compilation**: Successful
- ✅ **Routes**: All 63 routes compiled

---

## 🚧 Remaining Work: Migrate 61 Pages

### Migration Pattern

**OLD Pattern (localStorage):**
```typescript
const [user, setUser] = useState<any>(null);

useEffect(() => {
  const storedUser = localStorage.getItem("sda_user");
  if (storedUser) {
    setUser(JSON.parse(storedUser));
  }
}, []);

if (!user) {
  return <div>Loading...</div>;
}
```

**NEW Pattern (useSession hook):**
```typescript
import { useSession } from "@/hooks/useSession";

export default function MyPage() {
  const { user, loading } = useSession();

  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!user) {
    // useSession automatically redirects to login via RequireAuth
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // Page content
  return <div>Welcome {user.firstName}</div>;
}
```

**ALTERNATIVE: Use RequireAuth wrapper (recommended):**
```typescript
import { RequireAuth } from "@/components/RequireAuth";
import { useSession } from "@/hooks/useSession";

export default function MyPage() {
  return (
    <RequireAuth>
      <PageContent />
    </RequireAuth>
  );
}

function PageContent() {
  const { user } = useSession();

  // user is guaranteed to exist here
  return <div>Welcome {user!.firstName}</div>;
}
```

---

## 📋 Files Requiring Migration

### Critical Pages (Do First - 10 files)
1. `src/app/dashboard/page.tsx`
2. `src/app/settings/page.tsx`
3. `src/components/SILProviderHeader.tsx`
4. `src/app/properties/page.tsx`
5. `src/app/properties/[id]/page.tsx`
6. `src/app/participants/page.tsx`
7. `src/app/participants/[id]/page.tsx`
8. `src/app/payments/page.tsx`
9. `src/app/financials/page.tsx`
10. `src/app/operations/page.tsx`

### Database Pages (11 files)
11. `src/app/database/page.tsx`
12. `src/app/database/ContractorsContent.tsx`
13. `src/app/database/occupational-therapists/page.tsx`
14. `src/app/database/occupational-therapists/OccupationalTherapistsContent.tsx`
15. `src/app/database/sil-providers/page.tsx`
16. `src/app/database/sil-providers/[id]/page.tsx`
17. `src/app/database/sil-providers/SILProvidersContent.tsx`
18. `src/app/database/support-coordinators/page.tsx`
19. `src/app/database/support-coordinators/[id]/page.tsx`
20. `src/app/database/support-coordinators/SupportCoordinatorsContent.tsx`
21. `src/app/contractors/page.tsx`

### Operational Pages (20 files)
22. `src/app/maintenance/[id]/page.tsx`
23. `src/app/maintenance/new/page.tsx`
24. `src/app/incidents/[id]/page.tsx`
25. `src/app/incidents/new/page.tsx`
26. `src/app/inspections/page.tsx`
27. `src/app/inspections/[id]/page.tsx`
28. `src/app/inspections/new/page.tsx`
29. `src/app/inspections/templates/page.tsx`
30. `src/app/documents/new/page.tsx`
31. `src/app/alerts/page.tsx`
32. `src/app/compliance/page.tsx`
33. `src/app/compliance/certifications/new/page.tsx`
34. `src/app/compliance/complaints/new/page.tsx`
35. `src/app/compliance/insurance/new/page.tsx`
36. `src/app/onboarding/page.tsx`
37. `src/app/preventative-schedule/page.tsx`
38. `src/app/preventative-schedule/new/page.tsx`
39. `src/app/preventative-schedule/templates/page.tsx`
40. `src/app/reports/page.tsx`
41. `src/app/claims/page.tsx`

### Financial Pages (4 files)
42. `src/app/financials/bank-accounts/page.tsx`
43. `src/app/financials/reconciliation/page.tsx`
44. `src/app/payments/new/page.tsx`
45. `src/app/payments/distributions/page.tsx`
46. `src/app/payments/ndis-export/page.tsx`

### Follow-ups (5 files)
47. `src/app/follow-ups/page.tsx`
48. `src/app/follow-ups/communications/[id]/page.tsx`
49. `src/app/follow-ups/communications/new/page.tsx`
50. `src/app/follow-ups/tasks/[id]/page.tsx`
51. `src/app/follow-ups/tasks/new/page.tsx`

### Portal (SIL Provider Pages - 6 files)
52. `src/app/portal/dashboard/page.tsx`
53. `src/app/portal/properties/page.tsx`
54. `src/app/portal/maintenance/page.tsx`
55. `src/app/portal/maintenance/new/page.tsx`
56. `src/app/portal/incidents/page.tsx`
57. `src/app/portal/incidents/new/page.tsx`

### Other Pages (5 files)
58. `src/app/participants/new/page.tsx`
59. `src/app/participants/[id]/edit/page.tsx`
60. `src/app/properties/new/page.tsx`
61. `src/app/properties/[id]/edit/page.tsx`
62. `src/app/properties/[id]/dwellings/new/page.tsx`
63. `src/app/admin/ai/page.tsx`

---

## 🔧 Automated Migration Script

Use this bash script to help identify files needing migration:

```bash
# Find all files still using localStorage "sda_user"
grep -r "sda_user" src/ --include="*.tsx" --exclude="src/hooks/useSession.ts"

# Count remaining files
grep -r "sda_user" src/ --include="*.tsx" --exclude="src/hooks/useSession.ts" | wc -l
```

---

## ✅ Testing Checklist

After migration, test these flows:

1. **Login Flow**
   - ✓ Login with valid credentials
   - ✓ Tokens stored correctly
   - ✓ Redirect to correct dashboard (admin vs SIL provider)

2. **Session Validation**
   - ✓ Refresh page → session persists
   - ✓ Navigate between pages → user stays logged in
   - ✓ Invalid token → redirect to login

3. **Logout Flow**
   - ✓ Logout clears all tokens
   - ✓ Redirect to login page
   - ✓ Cannot access protected pages after logout

4. **Token Refresh**
   - ✓ Token auto-refreshes after 23 hours
   - ✓ Expired refresh token → redirect to login

5. **Role-Based Access**
   - ✓ SIL providers can only access portal
   - ✓ Admins can access all pages
   - ✓ RequireAuth with allowedRoles works

---

## 🎯 Success Criteria

- ✅ All 63 files migrated
- ✅ No `localStorage.getItem("sda_user")` calls remain
- ✅ Build succeeds with no TypeScript errors
- ✅ All routes accessible with proper authentication
- ✅ Token refresh works automatically
- ✅ Logout clears all session data

---

**Status**: Core infrastructure complete. Ready for page-by-page migration.
