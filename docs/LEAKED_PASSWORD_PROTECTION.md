# Leaked Password Protection Configuration

## Overview

Supabase Auth can be configured to check passwords against the HaveIBeenPwned database of compromised credentials. This prevents users from using passwords that have been exposed in data breaches.

**Current Status**: ⚠️ DISABLED (as per linter warning)

**Recommendation**: ✅ ENABLE for production

## Why Enable This?

1. **User Protection**: Prevents users from using passwords that are known to be compromised
2. **Platform Security**: Reduces risk of account takeovers using breached credentials
3. **Compliance**: Many security standards recommend or require this protection
4. **Zero Cost**: The check is performed at signup/password reset with minimal performance impact

## How to Enable

### Step 1: Access Supabase Dashboard

1. Log into your Supabase project dashboard
2. Navigate to: **Authentication** → **Policies** → **Password Settings**

### Step 2: Enable Leaked Password Protection

Find the "Leaked Password Protection" setting and enable it:

```
☑ Enable Leaked Password Protection
```

Configuration options:
- **Minimum Password Length**: Set to at least 8 characters (recommended: 10+)
- **Require Uppercase**: Optional but recommended
- **Require Lowercase**: Optional but recommended
- **Require Numbers**: Optional but recommended
- **Require Special Characters**: Optional but recommended
- **Leaked Password Check**: ✅ Enable this

### Step 3: Configure Error Messages

When a user attempts to use a compromised password, they'll receive an error. Ensure your application handles this gracefully.

## Frontend Integration

### Signup Flow

Update your signup component to handle the leaked password error:

```typescript
// Example using Supabase JS Client
const handleSignup = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    // Check for leaked password error
    if (error.message.includes('password') && 
        (error.message.toLowerCase().includes('leak') || 
         error.message.toLowerCase().includes('compromised') ||
         error.message.toLowerCase().includes('breach'))) {
      // Show user-friendly message
      setError(
        'This password has been found in a data breach and cannot be used. ' +
        'Please choose a different password.'
      );
      return;
    }
    
    // Handle other errors
    setError(error.message);
    return;
  }

  // Success
  setSuccess('Account created successfully!');
};
```

### Password Reset Flow

```typescript
const handlePasswordReset = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    // Check for leaked password error
    if (error.message.includes('password') && 
        (error.message.toLowerCase().includes('leak') || 
         error.message.toLowerCase().includes('compromised'))) {
      setError(
        'This password has been found in a data breach. ' +
        'Please choose a more secure password.'
      );
      return;
    }
    
    setError(error.message);
    return;
  }

  setSuccess('Password updated successfully!');
};
```

### Password Change Flow

```typescript
const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
  // First verify current password by signing in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    setError('Current password is incorrect');
    return;
  }

  // Update to new password
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    if (error.message.toLowerCase().includes('leak') || 
        error.message.toLowerCase().includes('compromised')) {
      setError(
        'This password has appeared in a data breach and cannot be used. ' +
        'Please choose a different password.'
      );
      return;
    }
    
    setError(error.message);
    return;
  }

  setSuccess('Password changed successfully!');
};
```

## User Experience Recommendations

### Clear Error Messages

❌ **Bad**: "Password validation failed"

✅ **Good**: "This password has been found in a data breach and cannot be used. Please choose a different, unique password."

### Helpful Guidance

When showing the error, also provide guidance:

```typescript
const LeakedPasswordError = () => (
  <div className="error-message">
    <h4>⚠️ This password cannot be used</h4>
    <p>
      This password has appeared in a data breach and is not secure.
      Please choose a different password.
    </p>
    <div className="tips">
      <h5>Tips for a strong password:</h5>
      <ul>
        <li>Use at least 12 characters</li>
        <li>Mix uppercase and lowercase letters</li>
        <li>Include numbers and special characters</li>
        <li>Avoid common words or patterns</li>
        <li>Don't reuse passwords from other sites</li>
        <li>Consider using a password manager</li>
      </ul>
    </div>
  </div>
);
```

### Password Strength Meter

Consider adding a real-time password strength meter to help users choose strong passwords:

```typescript
import zxcvbn from 'zxcvbn'; // Popular password strength library

const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const result = zxcvbn(password);
  
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['#d73f40', '#dc6551', '#f2b84f', '#bde952', '#3ba62f'];
  
  return (
    <div className="password-strength">
      <div 
        className="strength-bar" 
        style={{
          width: `${(result.score + 1) * 20}%`,
          backgroundColor: strengthColors[result.score]
        }}
      />
      <span className="strength-label">
        {strengthLabels[result.score]}
      </span>
      {result.feedback.suggestions.length > 0 && (
        <ul className="suggestions">
          {result.feedback.suggestions.map((suggestion, i) => (
            <li key={i}>{suggestion}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

## Testing the Feature

### Manual Testing

1. **Test with known breached password**:
   ```
   Try signing up with: password123
   Expected: Error message about leaked password
   ```

2. **Test with strong password**:
   ```
   Try signing up with: R$9mK#2nL@7pQ!4x
   Expected: Success
   ```

3. **Test password reset**:
   ```
   Request password reset
   Try using compromised password
   Expected: Error message
   ```

### Automated Testing

```typescript
describe('Leaked Password Protection', () => {
  it('should reject commonly breached passwords', async () => {
    const result = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123', // Known breached password
    });

    expect(result.error).toBeTruthy();
    expect(result.error?.message.toLowerCase()).toContain('leak');
  });

  it('should accept strong unique passwords', async () => {
    const result = await supabase.auth.signUp({
      email: 'test@example.com',
      password: generateStrongPassword(), // Use a password generator
    });

    expect(result.error).toBeNull();
    expect(result.data.user).toBeTruthy();
  });
});
```

## Impact on Existing Users

### User Database Not Affected

Enabling leaked password protection:
- ✅ Does NOT force existing users to change passwords
- ✅ Does NOT check existing passwords retroactively
- ✅ Only applies to NEW passwords (signup, reset, change)

### Gradual Rollout Recommendation

1. **Phase 1**: Enable for new signups only
2. **Phase 2**: After 2 weeks, prompt users to update passwords during login if they're weak
3. **Phase 3**: Enforce on all password changes

### Optional: Encourage Password Updates

```typescript
// Check password strength on login (optional)
const handleLogin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error && data.user) {
    // Optionally check if password is weak and suggest update
    const strength = zxcvbn(password);
    
    if (strength.score < 3) {
      // Show non-blocking banner
      showBanner(
        'Your password could be stronger. ' +
        'Consider updating it in your account settings.'
      );
    }
  }
};
```

## Performance Considerations

### HaveIBeenPwned API

- **Check Method**: k-anonymity model (only first 5 characters of hash sent)
- **Privacy**: Full password never sent to external service
- **Performance**: Adds ~100-300ms to signup/password change
- **Reliability**: Cached responses, graceful degradation if API unavailable

### Supabase Implementation

Supabase handles the HaveIBeenPwned integration:
1. Password is hashed locally (SHA-1)
2. First 5 characters of hash sent to API
3. Full list of matching hashes received
4. Supabase checks if full hash matches
5. Returns error if password is compromised

## Security Benefits

### Prevents Common Attack Vectors

1. **Credential Stuffing**: Attackers can't use known leaked credentials
2. **Dictionary Attacks**: Common passwords are blocked
3. **Password Reuse**: Users forced to choose unique passwords

### Defense in Depth

Even with other security measures, leaked password protection adds another layer:
- Works alongside 2FA/MFA
- Complements rate limiting
- Enhances password policies

## Compliance and Standards

This feature helps meet requirements from:
- **NIST 800-63B**: Recommends checking against breach databases
- **OWASP ASVS**: Application Security Verification Standard
- **PCI DSS**: Payment Card Industry Data Security Standard
- **SOC 2**: Security and availability requirements

## Monitoring and Metrics

After enabling, monitor:

1. **Rejection Rate**: How many password attempts are rejected?
   ```sql
   -- Log rejected passwords (don't log the actual passwords!)
   CREATE TABLE password_rejection_log (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_email TEXT,
     rejection_reason TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **User Frustration**: Are users abandoning signup?
   - Track signup completion rate
   - Monitor support tickets about password issues
   - A/B test error message wording

3. **Password Strength Improvement**: Are users choosing stronger passwords?
   - Track average password strength scores
   - Compare before/after enabling the feature

## Troubleshooting

### Common Issues

**Issue**: Users report valid passwords being rejected

**Solution**: 
- Verify HaveIBeenPwned API is accessible
- Check Supabase service status
- Review error logs for specific error messages

**Issue**: Error messages not displaying correctly

**Solution**:
- Check error handling in frontend code
- Verify error message localization
- Test with different browsers

**Issue**: Password reset emails not being received

**Solution**:
- Check email configuration in Supabase
- Verify email templates are set up
- Check spam folders

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## Summary

✅ **Action Required**: Enable Leaked Password Protection in Supabase Dashboard

📝 **Frontend Updates**: Handle leaked password errors gracefully with user-friendly messages

🧪 **Testing**: Test signup, password reset, and password change flows

📊 **Monitor**: Track rejection rates and user feedback

🎯 **Goal**: Improve platform security without degrading user experience






