import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
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
  PawPrint,
  Laptop,
  Smartphone,
  Server,
  Atom,
  Microscope,
  Pizza,
  Coffee,
  Cake,
  Leaf,
  TreeDeciduous,
  Sun,
  Book,
  BookOpen,
  BookOpenCheck,
  Car,
  Camera,
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
  Users,
  Heart,
  Brain,
  Code2
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
    'book-open-check': BookOpenCheck,
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

const CategoryChip = ({ category, onPress, selected }) => {
  const IconComponent = getCategoryIcon(category.iconName);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.selectedContainer
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <IconComponent
          size={16}
          color={selected ? theme.colors.background : theme.colors.text}
          style={styles.icon}
        />
        <Text style={[
          styles.text,
          selected && styles.selectedText
        ]}>
          {category.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.chipBackground || '#101010',
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.chipBorder || '#27272A',
  },
  selectedContainer: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: theme.spacing.xs,
  },
  text: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: 'Outfit_400Regular',
  },
  selectedText: {
    color: theme.colors.background,
  },
});

export default CategoryChip; 