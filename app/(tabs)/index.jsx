import * as Notifications from "expo-notifications";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebase";

const { width } = Dimensions.get("window");

// Konfigurasi handler notifikasi (di luar komponen untuk scope global)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Countdown() {
  const [specialDays, setSpecialDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentPartnerId, setCurrentPartnerId] = useState(undefined);
  // Tambahkan Set untuk melacak ID notifikasi 10 menit
  const scheduledNotificationIds = useRef(new Set());
  const scheduledPreNotificationIds = useRef(new Set()); // NEW: Untuk notifikasi 10 menit sebelumnya

  // --- Fungsi untuk meminta izin notifikasi ---
  async function registerForPushNotificationsAsync() {
    let token;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert(
        "Failed to get push token for push notification! Please enable notifications in your device settings."
      );
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Expo Push Token:", token);
    return token;
  }

  // --- Fungsi untuk menjadwalkan notifikasi ---
  const scheduleSpecialDayNotification = async (specialDayItem) => {
    const notificationId = `special-day-${specialDayItem.id}`;
    const preNotificationId = `special-day-pre-${specialDayItem.id}`; // NEW: ID untuk notifikasi 10 menit sebelumnya

    // 1. Logika untuk notifikasi tepat waktu (yang sudah ada)
    if (scheduledNotificationIds.current.has(notificationId)) {
      console.log(
        `Main notification for ${specialDayItem.title} (${notificationId}) already scheduled.`
      );
      // return; // Jangan return di sini karena kita juga akan menjadwalkan pre-notification
    } else {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }

    // 2. Logika untuk notifikasi 10 menit sebelumnya (NEW)
    if (scheduledPreNotificationIds.current.has(preNotificationId)) {
      console.log(
        `Pre-notification for ${specialDayItem.title} (${preNotificationId}) already scheduled.`
      );
    } else {
      await Notifications.cancelScheduledNotificationAsync(preNotificationId);
    }

    const now = new Date();
    let targetDateTime = new Date(specialDayItem.date);

    if (specialDayItem.time instanceof Date) {
      targetDateTime.setHours(special_dayItem.time.getHours());
      targetDateTime.setMinutes(specialDayItem.time.getMinutes());
      targetDateTime.setSeconds(specialDayItem.time.getSeconds());
      targetDateTime.setMilliseconds(0);
    } else if (
      typeof specialDayItem.time === "string" &&
      /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/.test(specialDayItem.time)
    ) {
      const [hours, minutes] = specialDayItem.time.split(":").map(Number);
      targetDateTime.setHours(hours);
      targetDateTime.setMinutes(minutes);
      targetDateTime.setSeconds(0);
      targetDateTime.setMilliseconds(0);
    } else {
      // Default pukul 9 pagi jika tidak ada waktu spesifik
      targetDateTime.setHours(9, 0, 0, 0);
    }

    // Jadwalkan notifikasi utama jika masih di masa depan
    if (targetDateTime > now) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: notificationId,
          content: {
            title: "🎉 Special Day Reminder! 🎉",
            body: `Your special day: ${specialDayItem.title} in ${specialDayItem.time}! Don't forget!`,
            data: {
              specialDayId: specialDayItem.id,
              title: specialDayItem.title,
            },
            sound: true,
          },
          trigger: {
            date: targetDateTime,
            repeats: false,
          },
        });
        console.log(
          `Main notification scheduled for: ${
            specialDayItem.title
          } at ${targetDateTime.toLocaleString()}`
        );
        scheduledNotificationIds.current.add(notificationId);
      } catch (error) {
        console.error(
          `Failed to schedule main notification for ${specialDayItem.title}:`,
          error
        );
      }
    } else {
      console.log(
        `Main notification for ${specialDayItem.title} not scheduled (past event).`
      );
      scheduledNotificationIds.current.delete(notificationId);
    }

    // NEW: Jadwalkan notifikasi 10 menit sebelumnya
    const preNotificationTime = new Date(
      targetDateTime.getTime() - 10 * 60 * 1000
    ); // Kurangi 10 menit
    if (preNotificationTime > now) {
      // Pastikan waktu pra-notifikasi juga di masa depan
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: preNotificationId,
          content: {
            title: "🔔 Upcoming Special Day! 🔔",
            body: `Just 10 minutes until your special day: ${specialDayItem.title}! Get ready!`,
            data: {
              specialDayId: specialDayItem.id,
              title: specialDayItem.title,
              type: "pre_event_reminder",
            },
            sound: true,
          },
          trigger: {
            date: preNotificationTime,
            repeats: false,
          },
        });
        console.log(
          `Pre-notification scheduled for: ${
            specialDayItem.title
          } at ${preNotificationTime.toLocaleString()} (10 mins before)`
        );
        scheduledPreNotificationIds.current.add(preNotificationId);
      } catch (error) {
        console.error(
          `Failed to schedule pre-notification for ${specialDayItem.title}:`,
          error
        );
      }
    } else {
      console.log(
        `Pre-notification for ${specialDayItem.title} not scheduled (too close or past event).`
      );
      scheduledPreNotificationIds.current.delete(preNotificationId);
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync();
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        await fetchPartnerId(user.uid);
      } else {
        setCurrentUserId(null);
        setCurrentPartnerId(undefined);
        setSpecialDays([]);
        setLoading(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  const fetchPartnerId = async (userId) => {
    try {
      const q = query(collection(db, "users"), where("uid", "==", userId));
      const querySnapshot = await getDocs(q);
      let foundPartnerId = null;
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        if (userData.partnerId) {
          foundPartnerId = userData.partnerId;
        }
      }
      setCurrentPartnerId(foundPartnerId);
    } catch (error) {
      console.error("Error fetching partner ID for countdown:", error);
      setCurrentPartnerId(null);
    }
  };

  useEffect(() => {
    let unsubscribeFirestore = () => {};

    if (currentUserId && currentPartnerId !== undefined) {
      setLoading(true);
      try {
        let q;
        if (currentPartnerId) {
          q = query(
            collection(db, "events"),
            where("isSpecialDay", "==", true),
            where("userIds", "array-contains-any", [
              currentUserId,
              currentPartnerId,
            ]),
            orderBy("date", "asc")
          );
        } else {
          q = query(
            collection(db, "events"),
            where("isSpecialDay", "==", true),
            where("userIds", "array-contains", currentUserId),
            orderBy("date", "asc")
          );
        }

        unsubscribeFirestore = onSnapshot(
          q,
          (querySnapshot) => {
            const fetchedSpecialDays = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              date: doc.data().date?.toDate(),
              time: doc.data().time?.toDate ? doc.data().time.toDate() : null,
            }));

            const now = new Date();
            const filteredDays = fetchedSpecialDays.filter((day) => {
              const dayDate = day.date;

              let fullTargetDateTime = new Date(dayDate);
              if (day.time instanceof Date) {
                fullTargetDateTime.setHours(day.time.getHours());
                fullTargetDateTime.setMinutes(day.time.getMinutes());
                fullTargetDateTime.setSeconds(day.time.getSeconds());
                fullTargetDateTime.setMilliseconds(0);
              } else if (
                typeof day.time === "string" &&
                /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/.test(day.time)
              ) {
                const [hours, minutes] = day.time.split(":").map(Number);
                fullTargetDateTime.setHours(hours);
                fullTargetDateTime.setMinutes(minutes);
                fullTargetDateTime.setSeconds(0);
                fullTargetDateTime.setMilliseconds(0);
              } else {
                fullTargetDateTime.setHours(0, 0, 0, 0);
              }

              // Periksa apakah event utama sudah lewat
              if (fullTargetDateTime < now) {
                return false; // Jangan tampilkan atau jadwalkan jika sudah lewat
              }

              // Jadwalkan kedua jenis notifikasi
              scheduleSpecialDayNotification(day);

              const todayAtMidnight = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
              );
              const targetDateAtMidnight = new Date(
                dayDate.getFullYear(),
                dayDate.getMonth(),
                dayDate.getDate()
              );

              const diffTime =
                targetDateAtMidnight.getTime() - todayAtMidnight.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              // Add a property to indicate if it's very close (e.g., within 3 days)
              day.isVeryClose = diffDays > 0 && diffDays <= 3; // New highlight for very close events
              day.isApproaching =
                diffDays > 0 && diffDays <= 7 && !day.isVeryClose; // Renamed, now excludes very close

              // Calculate total days for progress bar, assuming 30 days is max horizon
              const totalDaysHorizon = 30; // Max days in countdown view
              const daysPassedInHorizon = totalDaysHorizon - diffDays;
              day.progressBarProgress =
                (daysPassedInHorizon / totalDaysHorizon) * 100;
              if (day.progressBarProgress < 0) day.progressBarProgress = 0; // Clamp min
              if (day.progressBarProgress > 100) day.progressBarProgress = 100; // Clamp max

              return diffDays >= 0 && diffDays <= totalDaysHorizon;
            });

            setSpecialDays(filteredDays);
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching special days for countdown:", error);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error("Error setting up countdown listener:", error);
        setLoading(false);
      }
    } else if (currentUserId && currentPartnerId === undefined) {
      setLoading(true);
    } else {
      setLoading(false);
    }

    return () => {
      unsubscribeFirestore();
      // Notifications.cancelAllScheduledNotificationsAsync(); // Opsional: Batalkan semua notifikasi saat keluar
    };
  }, [currentUserId, currentPartnerId]);

  const calculateCountdown = (targetDate, targetTime) => {
    const now = new Date();
    let targetDateTime = new Date(targetDate);

    if (targetTime instanceof Date) {
      targetDateTime.setHours(targetTime.getHours());
      targetDateTime.setMinutes(targetTime.getMinutes());
      targetDateTime.setSeconds(targetTime.getSeconds());
      targetDateTime.setMilliseconds(0);
    } else if (
      typeof targetTime === "string" &&
      /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/.test(targetTime)
    ) {
      const [hours, minutes] = targetTime.split(":").map(Number);
      targetDateTime.setHours(hours);
      targetDateTime.setMinutes(minutes);
      targetDateTime.setSeconds(0);
      targetDateTime.setMilliseconds(0);
    }

    const difference = targetDateTime.getTime() - now.getTime();

    if (difference < 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, happened: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, happened: false };
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSpecialDays((prevDays) => [...prevDays]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || currentUserId === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={styles.loadingText}>
          {currentUserId === null
            ? "Please log in to see your countdowns."
            : "Loading countdowns..."}
        </Text>
      </View>
    );
  }

  const sortedSpecialDays = [...specialDays].sort((a, b) => {
    const dateA = new Date(a.date);
    if (a.time instanceof Date) {
      dateA.setHours(
        a.time.getHours(),
        a.time.getMinutes(),
        a.time.getSeconds(),
        0
      );
    } else if (
      typeof a.time === "string" &&
      /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/.test(a.time)
    ) {
      const [hours, minutes] = a.time.split(":").map(Number);
      dateA.setHours(hours, minutes, 0, 0);
    }

    const dateB = new Date(b.date);
    if (b.time instanceof Date) {
      dateB.setHours(
        b.time.getHours(),
        b.time.getMinutes(),
        b.time.getSeconds(),
        0
      );
    } else if (
      typeof b.time === "string" &&
      /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/.test(b.time)
    ) {
      const [hours, minutes] = b.time.split(":").map(Number);
      dateB.setHours(hours, minutes, 0, 0);
    }
    return dateA.getTime() - dateB.getTime();
  });

  if (sortedSpecialDays.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>
          No special days in the next 30 days.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1f2937" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Upcoming Special Days</Text>
        {sortedSpecialDays.map((day) => {
          const countdown = calculateCountdown(day.date, day.time);
          return (
            <View
              key={day.id}
              style={[
                styles.card,
                day.isApproaching && styles.approachingCard,
                day.isVeryClose && styles.veryCloseCard, // Gaya baru untuk sangat dekat
              ]}
            >
              <Text style={styles.title}>
                {day.title} {day.isVeryClose && "🚨"}
              </Text>
              <Text style={styles.date}>
                {day.date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {day.time &&
                  ` - ${day.time.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
              </Text>
              {countdown.happened ? (
                <Text style={styles.countdownHappened}>Happened!</Text>
              ) : (
                <>
                  {/* Progress Bar */}
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${day.progressBarProgress}%` },
                      ]}
                    />
                  </View>

                  {/* Main Countdown Display */}
                  <View style={styles.countdownMainDisplay}>
                    <Text style={styles.daysNumber}>{countdown.days}</Text>
                    <Text style={styles.daysLabel}>DAYS</Text>
                  </View>

                  {/* Detailed Countdown */}
                  <View style={styles.countdownContainer}>
                    <View style={styles.countdownSegment}>
                      <Text style={styles.countdownNumber}>
                        {countdown.hours}
                      </Text>
                      <Text style={styles.countdownLabel}>Hrs</Text>
                    </View>
                    <Text style={styles.countdownSeparator}>:</Text>
                    <View style={styles.countdownSegment}>
                      <Text style={styles.countdownNumber}>
                        {countdown.minutes}
                      </Text>
                      <Text style={styles.countdownLabel}>Min</Text>
                    </View>
                    <Text style={styles.countdownSeparator}>:</Text>
                    <View style={styles.countdownSegment}>
                      <Text style={styles.countdownNumber}>
                        {countdown.seconds}
                      </Text>
                      <Text style={styles.countdownLabel}>Sec</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#1f2937",
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1f2937",
  },
  loadingText: {
    marginTop: 10,
    color: "#ffffff",
    fontSize: 16,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1f2937",
    padding: 20,
  },
  noDataText: {
    color: "#9ca3af",
    textAlign: "center",
    fontSize: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#374151",
    borderRadius: 15, // Lebih bulat
    padding: 20, // Lebih banyak padding
    marginVertical: 12, // Margin vertikal lebih besar
    width: width * 0.9,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, // Bayangan lebih jelas
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8, // Efek shadow untuk Android
  },
  approachingCard: {
    // Gaya untuk hari mendekat (4-7 hari)
    borderWidth: 2,
    borderColor: "#facc15", // Kuning
    backgroundColor: "#4b5563",
  },
  veryCloseCard: {
    // Gaya baru untuk hari yang sangat dekat (1-3 hari)
    borderWidth: 3, // Border lebih tebal
    borderColor: "#ef4444", // Merah menyala
    backgroundColor: "#be123c", // Background lebih gelap/merah untuk urgensi
  },
  title: {
    fontSize: 22, // Sedikit lebih besar
    fontWeight: "bold",
    color: "#ec4899",
    marginBottom: 8,
    textAlign: "center",
  },
  date: {
    fontSize: 16,
    color: "#d1d5db",
    marginBottom: 15,
    textAlign: "center",
  },
  countdownHappened: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ef4444",
    marginTop: 10,
  },
  // --- New Styles for Progress Bar ---
  progressBarBackground: {
    height: 8,
    width: "100%",
    backgroundColor: "#4b5563",
    borderRadius: 5,
    marginBottom: 15,
    overflow: "hidden", // Penting agar fill tidak keluar
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#38bdf8", // Warna biru untuk progress
    borderRadius: 5,
  },
  // --- New Styles for Main Countdown Display (DAYS) ---
  countdownMainDisplay: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 15,
  },
  daysNumber: {
    fontSize: 60, // Sangat besar untuk hari
    fontWeight: "bold",
    color: "#ec4899", // Warna pink/ungu cerah
    lineHeight: 60, // Sesuaikan tinggi baris
  },
  daysLabel: {
    fontSize: 18,
    color: "#d1d5db",
    fontWeight: "bold",
    marginTop: -5, // Sedikit naik agar dekat dengan angka
  },
  // --- Styles for Detailed Countdown (Hrs, Min, Sec) ---
  countdownContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },
  countdownSegment: {
    backgroundColor: "#1f2937",
    paddingVertical: 10, // Lebih banyak padding
    paddingHorizontal: 15,
    borderRadius: 10, // Lebih bulat
    marginHorizontal: 6, // Jarak antar segmen
    alignItems: "center",
    minWidth: 70, // Lebar minimum lebih besar
    borderWidth: 1, // Border tipis
    borderColor: "#374151", // Warna border
  },
  countdownNumber: {
    fontSize: 32, // Lebih besar
    fontWeight: "bold",
    color: "#38bdf8",
  },
  countdownLabel: {
    fontSize: 14, // Sedikit lebih besar
    color: "#9ca3af",
    marginTop: 4,
  },
  countdownSeparator: {
    fontSize: 32, // Lebih besar
    fontWeight: "bold",
    color: "#ffffff",
    marginHorizontal: 4,
  },
});
