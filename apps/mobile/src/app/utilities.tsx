import React, { useEffect, useRef } from 'react';
import { Link } from 'expo-router';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';

const tools = [
  { href: '/expenses' as const, icon: 'R$', title: 'Despesas', text: 'Controle os gastos da viagem.' },
  { href: '/diary' as const, icon: '✦', title: 'Diário', text: 'Guarde momentos e anotações.' },
];

export default function UtilitiesScreen() {
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(entrance, { toValue: 1, duration: 420, useNativeDriver: true }).start(); }, [entrance]);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Animated.View style={[styles.container, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
    <ThemedText style={styles.eyebrow}>FERRAMENTAS DE VIAGEM</ThemedText><ThemedText style={styles.title}>Utilidades</ThemedText><ThemedText themeColor="textSecondary">Tudo que ajuda no caminho, sem sobrecarregar sua navegação.</ThemedText>
    <View style={styles.grid}>{tools.map((tool) => <Link key={tool.title} href={tool.href} asChild><Pressable style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.975 : 1 }], opacity: pressed ? 0.88 : 1 })}><ThemedView type="backgroundElement" style={styles.card}><View style={styles.icon}><ThemedText style={styles.iconText}>{tool.icon}</ThemedText></View><View style={styles.copy}><ThemedText style={styles.cardTitle}>{tool.title}</ThemedText><ThemedText type="small" themeColor="textSecondary">{tool.text}</ThemedText></View><ThemedText style={styles.arrow}>›</ThemedText></ThemedView></Pressable></Link>)}</View>
    <ThemedView type="backgroundElement" style={styles.emergency}><ThemedText style={styles.cardTitle}>Clima e emergência</ThemedText><ThemedText type="small" themeColor="textSecondary">Acesso rápido ao clima, moeda e telefones úteis do destino.</ThemedText><View style={styles.chips}><View style={styles.chip}><ThemedText type="small">Clima</ThemedText></View><View style={styles.chip}><ThemedText type="small">Conversor</ThemedText></View><View style={styles.chip}><ThemedText type="small">SOS local</ThemedText></View></View></ThemedView>
  </Animated.View></ScrollView></SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1},content:{padding:Spacing.three,paddingBottom:BottomTabInset+110},container:{width:'100%',maxWidth:MaxContentWidth,alignSelf:'center',gap:Spacing.three},eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.6,color:Brand.coral},title:{fontSize:30,fontWeight:'900',color:Brand.navy},grid:{gap:10},card:{minHeight:88,padding:15,borderRadius:18,borderWidth:1,borderColor:'#DCE4F3',flexDirection:'row',alignItems:'center'},icon:{width:48,height:48,borderRadius:15,backgroundColor:'#EAF1FF',alignItems:'center',justifyContent:'center'},iconText:{color:Brand.navy,fontWeight:'900'},copy:{flex:1,marginLeft:13},cardTitle:{fontWeight:'800',marginBottom:4},arrow:{fontSize:26,color:Brand.navy},emergency:{padding:18,borderRadius:18,borderTopWidth:3,borderTopColor:Brand.coral},chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:14},chip:{paddingHorizontal:12,paddingVertical:7,borderRadius:999,backgroundColor:'#EAF1FF'}});
