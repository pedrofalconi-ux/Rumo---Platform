import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';

const categories = [
  ['Atrações', 'Pontos essenciais e experiências culturais'],
  ['Restaurantes', 'Seleção da agência perto de você'],
  ['Serviços úteis', 'Farmácias, hospitais e consulados'],
];

export default function ExploreScreen() {
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(entrance, { toValue: 1, duration: 420, useNativeDriver: true }).start(); }, [entrance]);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Animated.View style={[styles.container, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
    <ThemedText style={styles.eyebrow}>GUIA DO DESTINO</ThemedText><ThemedText style={styles.title}>Explorar</ThemedText><ThemedText themeColor="textSecondary">Descubra lugares recomendados e serviços essenciais durante a viagem.</ThemedText>
    <ThemedView type="backgroundElement" style={styles.map}><View style={styles.ring} /><View style={styles.pin}><ThemedText style={styles.pinText}>R</ThemedText></View><ThemedText style={styles.mapCaption}>Mapa do destino ativo</ThemedText></ThemedView>
    <View style={styles.grid}>{categories.map(([title, description]) => <ThemedView key={title} type="backgroundElement" style={styles.card}><ThemedText style={styles.cardTitle}>{title}</ThemedText><ThemedText type="small" themeColor="textSecondary">{description}</ThemedText></ThemedView>)}</View>
    <ThemedView type="backgroundElement" style={styles.tip}><ThemedText style={styles.cardTitle}>Guia rápido</ThemedText><ThemedText type="small" themeColor="textSecondary">Cultura local, segurança, transporte e clima reunidos para consulta rápida.</ThemedText></ThemedView>
  </Animated.View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe:{flex:1}, content:{padding:Spacing.three,paddingBottom:BottomTabInset+110}, container:{width:'100%',maxWidth:MaxContentWidth,alignSelf:'center',gap:Spacing.three}, eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.6,color:Brand.coral}, title:{fontSize:30,fontWeight:'900',color:Brand.navy}, map:{height:240,borderRadius:22,overflow:'hidden',alignItems:'center',justifyContent:'center',backgroundColor:'#EAF1FF',borderWidth:1,borderColor:'#DCE4F3'}, ring:{position:'absolute',width:190,height:190,borderRadius:95,borderWidth:28,borderColor:'#D5E4FF'}, pin:{width:52,height:52,borderRadius:26,backgroundColor:Brand.coral,alignItems:'center',justifyContent:'center',borderWidth:6,borderColor:'#fff'}, pinText:{color:'#fff',fontWeight:'900'}, mapCaption:{position:'absolute',bottom:16,fontSize:11,fontWeight:'700',color:Brand.navy}, grid:{gap:10}, card:{padding:16,borderRadius:16,borderWidth:1,borderColor:'#DCE4F3'}, cardTitle:{fontWeight:'800',marginBottom:4}, tip:{padding:18,borderRadius:18,borderLeftWidth:4,borderLeftColor:Brand.coral} });
