import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const ProfileAvatar = ({ user, size = 36 }) => {
  if (user?.user_metadata?.avatar_url) {
    return (
      <Image source={{ uri: user.user_metadata.avatar_url }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />
    );
  }
  const name = user?.user_metadata?.full_name || user?.email || '';
  const initial = name.charAt(0).toUpperCase();
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }] }>
      <Text style={[styles.initial, { fontSize: size * 0.6 }]}>{initial}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    resizeMode: 'cover',
  },
  circle: {
    backgroundColor: '#F9C406',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default ProfileAvatar; 