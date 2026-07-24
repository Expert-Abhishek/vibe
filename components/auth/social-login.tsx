import React from 'react';

export function SocialLogin({ onGoogleLogin }: { onGoogleLogin?: () => void }) {
  return null;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(14),
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    marginBottom: verticalScale(16),
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    marginHorizontal: scale(14),
    letterSpacing: 1.1,
  },
  googleButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
