// CategoryCard.js (veya ideal olarak CategoryChip.js olarak yeniden adlandırın)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import {
  Film,
  Music,
  Palette,
  Gamepad2,
  Dumbbell,
  FlaskConical,
  Landmark,
  Layers,
  Brain,
  Code2,
  Globe,
  History,
  Languages,
  Lightbulb,
  Map,
  Medal,
  Movie,
  Music2,
  Palette2,
  PenTool,
  Plane,
  Rocket,
  School,
  Star,
  Trophy,
  Video,
  Wifi,
  Book,
  BookOpen,
  Car,
  Camera,
  Coffee,
  Users,
  Heart,
  PawPrint,
  Laptop,
  Smartphone,
  Server,
  Atom,
  Microscope,
  Pizza,
  Cake,
  Leaf,
  TreeDeciduous,
  Sun,
  BookOpenCheck
} from 'lucide-react-native';

const getCategoryIcon = (iconName) => {
  if (!iconName) return Layers;
  
  const iconMap = {
    'star': Star,
    'globe': Globe,
    'film': Film,
    'palette': Palette,
    'image': Camera,
    'music': Music,
    'book': Book,
    'book-open': BookOpen,
    'car': Car,
    'map': Map,
    'camera': Camera,
    'coffee': Coffee,
    'trophy': Trophy,
    'users': Users,
    'heart': Heart,
    'gamepad-2': Gamepad2,
    'paw-print': PawPrint,
    'laptop': Laptop,
    'smartphone': Smartphone,
    'server': Server,
    'atom': Atom,
    'microscope': Microscope,
    'dumbbell': Dumbbell,
    'pizza': Pizza,
    'cake': Cake,
    'leaf': Leaf,
    'tree': TreeDeciduous,
    'sun': Sun,
    'landmark': Landmark,
    'book-open-check': BookOpenCheck,
    'brain': Brain,
    'code': Code2,
    'history': History,
    'languages': Languages,
    'lightbulb': Lightbulb,
    'medal': Medal,
    'movie': Movie,
    'music2': Music2,
    'palette2': Palette2,
    'pen-tool': PenTool,
    'plane': Plane,
    'rocket': Rocket,
    'school': School,
    'video': Video,
    'wifi': Wifi
  };

  return iconMap[iconName] || Layers;
};

// Bileşenin prop'larına 'isSelected' eklendi
const CategoryCard = ({ category, onPress, style, isSelected }) => {
  // 'description' ve 'color' prop'ları kategoriden alınmayacak,
  // çünkü çip tasarımı bunları farklı şekilde ele alıyor.
  const { name, iconName } = category;
  const IconComponent = getCategoryIcon(iconName);

  // Seçili olup olmamasına göre dinamik stiller
  const containerStyle = [
    styles.container,
    isSelected ? styles.containerSelected : styles.containerDefault,
    style, // Dışarıdan gelen ek stiller (örn: marginRight)
  ];

  const iconColor = isSelected ? (theme.colors.chipSelectedText || theme.colors.background) : theme.colors.text;
  const textColor = isSelected ? (theme.colors.chipSelectedText || theme.colors.background) : theme.colors.text;

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      activeOpacity={0.75} // Dokunma efekti biraz daha belirgin
    >
      <IconComponent size={16} color={iconColor} style={styles.icon} />
      <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
};

// Sabit CARD_WIDTH ve CARD_HEIGHT kaldırıldı, boyutlar içeriğe göre belirlenecek.
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', // İkon ve metin yan yana
    alignItems: 'center',
    borderRadius: theme.borderRadius.full, // Tamamen yuvarlak (hap şeklinde)
    paddingVertical: theme.spacing.sm,     // Dikey iç boşluk (örn: 8px)
    paddingHorizontal: theme.spacing.md, // Yatay iç boşluk (örn: 12px)
    // marginRight dışarıdan 'style' prop'u ile gelecek veya burada varsayılan eklenebilir
    // elevation ve shadow kaldırıldı, çipler genellikle düzdür.
  },
  containerDefault: {
    backgroundColor: theme.colors.chipBackground || '#101010', // Varsayılan çip arka planı (koyu gri)
    // İsteğe bağlı olarak kenarlık eklenebilir:
    borderWidth: 1,
    borderColor: theme.colors.chipBorder || '#27272A',
  },
  containerSelected: {
    backgroundColor: theme.colors.primary, // Seçili çip arka planı (sarı)
  },
  icon: {
    marginRight: theme.spacing.xs, // İkon ve metin arası boşluk (örn: 6px)
  },
  name: {
    fontSize: 14, // Çip için uygun font boyutu
    fontFamily: 'Outfit_400Regular', // Orta kalınlıkta
    // Renk, isSelected durumuna göre dinamik olarak ayarlanıyor
  },
  // iconContainer ve description stilleri kaldırıldı
});

export default CategoryCard;