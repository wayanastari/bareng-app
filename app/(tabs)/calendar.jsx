import { AntDesign, Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc, // Import onSnapshot untuk real-time updates
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../config/firebase.jsx";

const { width, height } = Dimensions.get("window");

export default function CalendarBareng() {
  const today = new Date();
  const initialSelectedDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [allEvents, setAllEvents] = useState([]);

  const [authLoading, setAuthLoading] = useState(true); // Loading untuk autentikasi
  const [dataLoading, setDataLoading] = useState(true); // Loading untuk data event
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentPartnerId, setCurrentPartnerId] = useState(undefined); // ID pasangan, gunakan undefined sebagai initial state untuk membedakan dari null

  // State untuk modal tambah/edit
  const [isAddEditModalVisible, setAddEditModalVisible] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemDateInput, setItemDateInput] = useState("");
  const [itemTimeInput, setItemTimeInput] = useState("");
  const [isSpecialDay, setIsSpecialDay] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // --- State untuk Login (Contoh Sederhana) ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginModalVisible, setLoginModalVisible] = useState(false);
  // ------------------------------------------

  // Effect untuk mengelola status autentikasi dan memuat partnerId
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true); // Mulai loading autentikasi
      if (user) {
        setCurrentUserId(user.uid);
        console.log("User logged in UID:", user.uid);
        // Penting: fetchPartnerId di sini dan tunggu hasilnya
        await fetchPartnerId(user.uid);
      } else {
        setCurrentUserId(null);
        setCurrentPartnerId(undefined); // Reset partnerId ke undefined jika user logout
        setAllEvents([]);
        console.log("User logged out.");
        //  dataLoading diset false jika tidak ada user
        setDataLoading(false);
      }
      setAuthLoading(false); // Selesai loading autentikasi
    });
    return unsubscribeAuth;
  }, []);

  // Effect untuk memuat data dari Firestore secara real-time
  useEffect(() => {
    let unsubscribeFirestore = () => {}; // Inisialisasi sebagai fungsi kosong

    // Hanya setup listener jika currentUserId sudah ada dan currentPartnerId sudah ditentukan (bukan undefined)
    if (currentUserId && currentPartnerId !== undefined) {
      console.log("--- Setting up Firestore real-time listener ---");
      console.log("currentUserId:", currentUserId);
      console.log("currentPartnerId:", currentPartnerId);

      setDataLoading(true);
      try {
        let q;
        if (currentPartnerId) {
          // Jika ada partner, ambil event yang melibatkan salah satu dari dua ID
          q = query(
            collection(db, "events"),
            where("userIds", "array-contains-any", [
              currentUserId,
              currentPartnerId,
            ])
          );
        } else {
          // Jika tidak ada partner, hanya ambil event pribadi
          q = query(
            collection(db, "events"),
            where("userIds", "array-contains", currentUserId)
          );
        }

        // Menggunakan onSnapshot untuk real-time updates
        unsubscribeFirestore = onSnapshot(
          q,
          (querySnapshot) => {
            console.log("--- Real-time Firestore Snapshot Received ---");
            const fetchedItems = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              // Pastikan konversi tanggal dari Timestamp Firestore
              date: doc.data().date?.toDate
                ? formatDate(doc.data().date.toDate())
                : doc.data().date,
              time: doc.data().time?.toDate
                ? formatTime(doc.data().time.toDate())
                : doc.data().time,
            }));

            console.log("--- Processed fetchedItems (onSnapshot) ---");
            console.log(fetchedItems);
            setAllEvents(fetchedItems);
            setDataLoading(false); // Set dataLoading false setelah data diterima
          },
          (error) => {
            console.error("Error listening to events/special days:", error);
            Alert.alert(
              "Error",
              "Failed to load data from the server in real-time."
            );
            setDataLoading(false);
          }
        );
      } catch (error) {
        console.error("Error setting up Firestore listener query:", error);
        Alert.alert("Error", "Failed to prepare data query.");
        setDataLoading(false);
      }
    } else if (currentUserId && currentPartnerId === undefined) {
      // Jika user ada tapi partnerId belum selesai di-fetch, tetap dalam loading state
      setDataLoading(true);
    } else {
      // Jika tidak ada user (currentUserId null), reset allEvents dan set loading false
      setAllEvents([]);
      setDataLoading(false);
    }

    // Fungsi cleanup: unsubscribe dari listener saat komponen unmount atau dependencies berubah
    return () => unsubscribeFirestore();
  }, [currentUserId, currentPartnerId]); // currentPartnerId sebagai dependency

  // Fungsi untuk mengambil Partner ID dari Firestore
  const fetchPartnerId = async (userId) => {
    try {
      const q = query(collection(db, "users"), where("uid", "==", userId));
      const querySnapshot = await getDocs(q); // Masih pakai getDocs karena ini hanya sekali ambil data partner saat login

      let foundPartnerId = null;
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        if (userData.partnerId) {
          foundPartnerId = userData.partnerId;
        }
      }

      if (foundPartnerId) {
        setCurrentPartnerId(foundPartnerId);
        console.log("Partner ID found:", foundPartnerId);
      } else {
        setCurrentPartnerId(null); // Set ke null jika tidak ada partner atau tidak ditemukan
        console.log("No partner found for user:", userId);
      }
    } catch (error) {
      console.error("Error fetching partner ID:", error);
      Alert.alert("Error", "Failed to load pair information.");
      setCurrentPartnerId(null); // Set ke null jika ada error
    }
  };

  const formatDate = (dateObj) => {
    if (!(dateObj instanceof Date)) {
      try {
        dateObj = new Date(dateObj);
        if (isNaN(dateObj.getTime())) {
          return "Invalid Date";
        }
      } catch (e) {
        return "Invalid Date";
      }
    }
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTime = (dateObj) => {
    if (!dateObj) return "";
    if (
      typeof dateObj === "string" &&
      /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/.test(dateObj)
    ) {
      return dateObj;
    }
    if (dateObj instanceof Date) {
      const hours = String(dateObj.getHours()).padStart(2, "0");
      const minutes = String(dateObj.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    try {
      const tempDate = new Date(dateObj);
      if (!isNaN(tempDate.getTime())) {
        const hours = String(tempDate.getHours()).padStart(2, "0");
        const minutes = String(tempDate.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
      }
    } catch (e) {
      // Fallback
    }
    return "";
  };

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
  const getMonthName = (monthIndex) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[monthIndex];
  };

  const renderCalendarDays = () => {
    const totalDays = daysInMonth(currentMonth, currentYear);
    const firstDay = firstDayOfMonth(currentMonth, currentYear);
    const calendarDays = [];
    const todayString = formatDate(new Date());

    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <View key={`empty-${i}`} style={styles.calendarDayEmpty} />
      );
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const isSelected = selectedDate === dateString;
      const isToday = todayString === dateString;
      const hasEvent = allEvents.some(
        (item) => item.date === dateString && !item.isSpecialDay
      );
      const isSpecial = allEvents.some(
        (item) => item.date === dateString && item.isSpecialDay
      );

      calendarDays.push(
        <TouchableOpacity
          key={dateString}
          style={[
            styles.calendarDay,
            isSelected && styles.selectedCalendarDay,
            isToday && styles.todayCalendarDay,
            hasEvent && styles.hasEventDay,
            isSpecial && styles.isSpecialDay,
          ]}
          onPress={() => setSelectedDate(dateString)}
        >
          <Text
            style={[
              styles.calendarDayText,
              isSelected && styles.selectedCalendarDayText,
            ]}
          >
            {day}
          </Text>
          {hasEvent && <View style={styles.eventDot} />}
          {isSpecial && <View style={styles.specialDayDot} />}
        </TouchableOpacity>
      );
    }
    return calendarDays;
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const isValidDateInput = (dateString) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const [year, month, day] = dateString.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    return (
      dateObj.getFullYear() === year &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getDate() === day
    );
  };

  const isValidTimeInput = (timeString) => {
    const regex = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/;
    return regex.test(timeString);
  };

  const handleSaveItem = async () => {
    if (!currentUserId) {
      Alert.alert("Error", "You must be logged in to add/edit items.");
      return;
    }
    if (itemTitle.trim() === "") {
      Alert.alert(
        "Alert",
        `Title ${isSpecialDay ? "special day" : "event"} cannot be empty.`
      );
      return;
    }
    if (!isValidDateInput(itemDateInput)) {
      Alert.alert("Alert", "Invalid date format. Use YYYY-MM-DD.");
      return;
    }
    if (itemTimeInput && !isValidTimeInput(itemTimeInput)) {
      Alert.alert("Alert", "Invalid time format. Use HH:MM.");
      return;
    }

    try {
      const [year, month, day] = itemDateInput.split("-").map(Number);
      let selectedDateTime;
      if (itemTimeInput) {
        const [hours, minutes] = itemTimeInput.split(":").map(Number);
        selectedDateTime = new Date(year, month - 1, day, hours, minutes);
      } else {
        selectedDateTime = new Date(year, month - 1, day);
      }

      const userIdsForDoc = [currentUserId];
      if (currentPartnerId) {
        userIdsForDoc.push(currentPartnerId);
      }

      const itemData = {
        date: selectedDateTime,
        time: selectedDateTime,
        title: itemTitle,
        description: isSpecialDay ? "" : itemDescription,
        isSpecialDay: isSpecialDay,
        createdBy: currentUserId,
        userIds: userIdsForDoc,
      };

      if (editingItem) {
        const itemRef = doc(db, "events", editingItem.id);
        await updateDoc(itemRef, itemData);
        Alert.alert(
          "Success",
          `${isSpecialDay ? "Special Day" : "Event"} successfully updated.!`
        );
      } else {
        await addDoc(collection(db, "events"), itemData);
        Alert.alert(
          "Success",
          `${isSpecialDay ? "Special Day" : "Event"} successfully added.!`
        );
      }
      resetModalState();
      setAddEditModalVisible(false);
      // Tidak perlu lagi memanggil fetchEventsAndSpecialDays() secara manual di sini,
      // karena onSnapshot di useEffect akan otomatis mendeteksi perubahan
    } catch (error) {
      console.error("Error saving item:", error);
      Alert.alert(
        "Error",
        `Failed to save ${isSpecialDay ? "special day" : "event"}.`
      );
    }
  };

  const handleDeleteEvent = (eventId) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this event?", // Pesan Alert
      [
        {
          text: "Cancel", // Tombol pertama: Cancel
          onPress: () => console.log("Deletion cancelled"),
          style: "cancel",
        },
        {
          text: "Delete", // Tombol kedua: Delete
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "events", eventId));
              console.log("Event deleted:", eventId);
              Alert.alert("Success", "Event deleted successfully!"); // Pesan sukses dalam Bahasa Inggris
            } catch (error) {
              console.error("Error deleting event:", error);
              Alert.alert("Error", "Failed to delete event. Please try again."); // Pesan error dalam Bahasa Inggris
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  const getEventsForSelectedDate = () => {
    return allEvents.filter(
      (item) => item.date === selectedDate && !item.isSpecialDay
    );
  };

  const getSpecialDaysForSelectedDate = () => {
    return allEvents.filter(
      (item) => item.date === selectedDate && item.isSpecialDay
    );
  };

  const resetModalState = () => {
    setItemTitle("");
    setItemDescription("");
    setItemDateInput(formatDate(new Date()));
    setItemTimeInput(formatTime(new Date()));
    setIsSpecialDay(false);
    setEditingItem(null);
  };

  const openAddEditModal = (item = null) => {
    if (!currentUserId) {
      Alert.alert("Alert", "Please log in first");
      return;
    }
    if (item) {
      setEditingItem(item);
      setItemTitle(item.title);
      setItemDescription(item.description || "");
      setItemDateInput(item.date);
      setItemTimeInput(item.time || "");
      setIsSpecialDay(item.isSpecialDay);
    } else {
      resetModalState();
      if (selectedDate) {
        setItemDateInput(selectedDate);
      }
      setItemTimeInput(formatTime(new Date())); // Default ke waktu sekarang
    }
    setAddEditModalVisible(true);
  };

  // Render UI
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ alignItems: "center", paddingBottom: 100 }}
      >
        <Text style={styles.headerText}>Couple Calendar</Text>
        <Text style={styles.subHeaderText}>Set Up a Schedule Together!</Text>

        {/* Calendar Navigation */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={goToPreviousMonth}
            style={styles.navButton}
          >
            <AntDesign name="left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.currentMonthYear}>
            {getMonthName(currentMonth)} {currentYear}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <AntDesign name="right" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Day Names */}
        <View style={styles.dayNamesContainer}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <Text key={day} style={styles.dayNameText}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>{renderCalendarDays()}</View>

        {/* Loading Indicators */}
        {(authLoading || dataLoading) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ec4899" />
            <Text style={styles.loadingText}>
              {authLoading ? "Authenticating..." : "Loading data..."}
            </Text>
          </View>
        )}

        {/* Events and Special Days List */}
        {!currentUserId && (
          <Text style={styles.noDataText}>
            Please log in to view and manage events.
          </Text>
        )}

        {currentUserId && !authLoading && !dataLoading && (
          <View style={styles.eventsSpecialDaysContainer}>
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
              <Text style={styles.sectionTitle}>Events on {selectedDate}</Text>
              {getEventsForSelectedDate().length > 0 ? (
                getEventsForSelectedDate().map((item) => (
                  <View key={item.id} style={styles.eventItem}>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle}>
                        {item.title} {item.time && `- ${item.time}`}
                      </Text>
                      <Text style={styles.eventDescription}>
                        {item.description}
                      </Text>
                    </View>
                    <View style={styles.eventActions}>
                      <TouchableOpacity
                        onPress={() => openAddEditModal(item)}
                        style={styles.editButton}
                      >
                        <AntDesign name="edit" size={20} color="#1f2937" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteEvent(item.id)}
                        style={styles.deleteButton}
                      >
                        <Feather name="trash-2" size={20} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>
                  There are no events on this date.
                </Text>
              )}

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                Special Days on {selectedDate}
              </Text>
              {getSpecialDaysForSelectedDate().length > 0 ? (
                getSpecialDaysForSelectedDate().map((sd) => (
                  <View key={sd.id} style={styles.specialDayItem}>
                    <View style={styles.eventInfo}>
                      <Text style={styles.specialDayTitle}>
                        {sd.title} {sd.time && `- ${sd.time}`}
                      </Text>
                    </View>
                    <View style={styles.eventActions}>
                      <TouchableOpacity
                        onPress={() => openAddEditModal(sd)}
                        style={styles.editButton}
                      >
                        <AntDesign name="edit" size={20} color="#1f2937" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteEvent(sd.id)}
                        style={styles.deleteButton}
                      >
                        <Feather name="trash-2" size={20} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>
                  There are no special days on this date.
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Add/Edit Event/Special Day Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isAddEditModalVisible}
          onRequestClose={() => {
            setAddEditModalVisible(false);
            resetModalState();
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingItem ? "Edit Item" : "Add New"}
              </Text>

              <TextInput
                style={[styles.input, styles.textInputInModal]}
                placeholder="Title"
                placeholderTextColor="#9ca3af"
                value={itemTitle}
                onChangeText={setItemTitle}
              />

              {!isSpecialDay && (
                <TextInput
                  style={[
                    styles.input,
                    styles.textInputInModal,
                    { height: 80 },
                  ]}
                  placeholder="Description (Optional)"
                  placeholderTextColor="#9ca3af"
                  multiline
                  value={itemDescription}
                  onChangeText={setItemDescription}
                />
              )}

              <TextInput
                style={[styles.input, styles.textInputInModal]}
                placeholder="Date (YYYY-MM-DD)"
                placeholderTextColor="#9ca3af"
                value={itemDateInput}
                onChangeText={setItemDateInput}
                keyboardType="numeric"
              />

              <TextInput
                style={[styles.input, styles.textInputInModal]}
                placeholder="Time (HH:MM) - Opsional"
                placeholderTextColor="#9ca3af"
                value={itemTimeInput}
                onChangeText={setItemTimeInput}
                keyboardType="numeric"
              />

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Is special day?</Text>
                <Switch
                  trackColor={{ false: "#767577", true: "#6b21a8" }}
                  thumbColor={isSpecialDay ? "#ec4899" : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={setIsSpecialDay}
                  value={isSpecialDay}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleSaveItem}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setAddEditModalVisible(false);
                    resetModalState();
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
      {/* Floating Action Button */}
      {currentUserId && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => openAddEditModal()} // Panggil modal tambah/edit
        >
          <Feather name="edit" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f2937",
    paddingTop: 60,
    width,
    height,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 1,
  },
  subHeaderText: {
    fontSize: 16,
    color: "#9ca3af",
    marginBottom: 30,
    textAlign: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    marginBottom: 24,
  },

  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  navButton: {
    padding: 10,
  },
  currentMonthYear: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
  },
  dayNamesContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "90%",
    marginBottom: 10,
  },
  dayNameText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "bold",
    width: `${100 / 7}%`,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "90%",
    aspectRatio: 1,
    backgroundColor: "#374151",
    borderRadius: 10,
    overflow: "hidden",
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 5,
    position: "relative",
  },
  calendarDayEmpty: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  calendarDayText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  selectedCalendarDay: {
    backgroundColor: "#6b21a8",
    borderRadius: 50,
  },
  selectedCalendarDayText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  todayCalendarDay: {
    backgroundColor: "#38bdf8",
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#0ea5e9",
  },
  hasEventDay: {
    borderWidth: 1,
    borderColor: "#ec4899",
    borderRadius: 50,
  },
  isSpecialDay: {
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 50,
  },
  eventDot: {
    position: "absolute",
    bottom: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ec4899",
  },
  specialDayDot: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3b82f6",
  },
  eventsSpecialDaysContainer: {
    width: "90%",
    marginTop: 30,
    padding: 15,
    backgroundColor: "#374151",
    borderRadius: 10,
    // maxHeight: height * 0.3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#6b21a8",
    paddingBottom: 5,
  },
  eventItem: {
    backgroundColor: "#4b5563",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  eventInfo: {
    flex: 1,
    marginRight: 10,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    flexShrink: 1, // biar teks shrink jika kepanjangan
    flexWrap: "wrap", // biar teks auto wrap
  },
  eventDescription: {
    fontSize: 14,
    color: "#d1d5db",
    marginTop: 4,
  },
  eventActions: {
    flexDirection: "row",
    gap: 10,
  },
  editButton: {
    backgroundColor: "#facc15",
    padding: 8,
    borderRadius: 5,
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    padding: 8,
    borderRadius: 5,
  },
  specialDayItem: {
    backgroundColor: "#4b5563",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  specialDayTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3b82f6",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  noDataText: {
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#ec4899",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    backgroundColor: "#374151",
    padding: 25,
    borderRadius: 15,
    width: "85%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    maxHeight: height * 0.8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#6b21a8",
    paddingBottom: 8,
    width: "100%",
    textAlign: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#4b5563",
    color: "#ffffff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  switchLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },
  modalButton: {
    backgroundColor: "#ec4899",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cancelButton: {
    backgroundColor: "#6b7280",
  },
  modalButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  authButton: {
    backgroundColor: "#6b21a8",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 15,
    width: "80%",
    alignItems: "center",
  },
  authButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  registerButton: {
    backgroundColor: "#3b82f6",
  },
  anonymousButton: {
    backgroundColor: "#4b5563",
  },
});
