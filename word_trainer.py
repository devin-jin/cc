import tkinter as tk


class WordTrainerApp:
    def __init__(self, root, words):
        self.root = root
        self.root.title("背单词拖拽示范")
        self.root.geometry("980x620")
        self.root.configure(bg="#f4f6fb")

        self.words = words[:]
        self.current_index = 0
        self.known_words = []
        self.unknown_words = []

        # Drag state
        self.drag_start_x = 0
        self.drag_start_y = 0

        self._build_ui()
        self._show_current_word()

    def _build_ui(self):
        title = tk.Label(
            self.root,
            text="拖动单词卡片：向左 = 认识，向右 = 不认识",
            font=("PingFang SC", 16, "bold"),
            bg="#f4f6fb",
            fg="#1f2d3d",
        )
        title.pack(pady=18)

        main_frame = tk.Frame(self.root, bg="#f4f6fb")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=16, pady=8)

        # Left panel (known)
        self.left_panel = tk.Frame(main_frame, bg="#e9f8ef", width=250, height=460, bd=1, relief=tk.SOLID)
        self.left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        self.left_panel.pack_propagate(False)
        tk.Label(
            self.left_panel,
            text="认识（向左拖）",
            bg="#e9f8ef",
            fg="#1f7a3f",
            font=("PingFang SC", 12, "bold"),
        ).pack(pady=(10, 6))
        self.known_listbox = tk.Listbox(self.left_panel, font=("Helvetica", 12))
        self.known_listbox.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

        # Center panel (drag area)
        self.center_panel = tk.Frame(main_frame, bg="#f4f6fb")
        self.center_panel.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.hint_label = tk.Label(
            self.center_panel,
            text="拖动卡片后松手分类",
            bg="#f4f6fb",
            fg="#5a6b7b",
            font=("PingFang SC", 11),
        )
        self.hint_label.pack(pady=(28, 6))

        self.card_area = tk.Canvas(
            self.center_panel,
            width=420,
            height=320,
            bg="#dfe6f2",
            highlightthickness=0,
        )
        self.card_area.pack(pady=10)

        self.card = self.card_area.create_rectangle(
            120, 95, 300, 225, fill="#ffffff", outline="#2b3a55", width=2
        )
        self.word_text = self.card_area.create_text(
            210, 160, text="", fill="#23344d", font=("Helvetica", 22, "bold")
        )

        self.card_area.tag_bind(self.card, "<ButtonPress-1>", self.on_drag_start)
        self.card_area.tag_bind(self.word_text, "<ButtonPress-1>", self.on_drag_start)
        self.card_area.tag_bind(self.card, "<B1-Motion>", self.on_drag_motion)
        self.card_area.tag_bind(self.word_text, "<B1-Motion>", self.on_drag_motion)
        self.card_area.tag_bind(self.card, "<ButtonRelease-1>", self.on_drag_release)
        self.card_area.tag_bind(self.word_text, "<ButtonRelease-1>", self.on_drag_release)

        self.progress_label = tk.Label(
            self.center_panel,
            text="",
            bg="#f4f6fb",
            fg="#2f3d4f",
            font=("PingFang SC", 11),
        )
        self.progress_label.pack(pady=6)

        btn_frame = tk.Frame(self.center_panel, bg="#f4f6fb")
        btn_frame.pack(pady=(10, 4))

        tk.Button(
            btn_frame,
            text="重置",
            command=self.reset_all,
            width=10,
            bg="#ffffff",
            relief=tk.RIDGE,
        ).pack(side=tk.LEFT, padx=8)

        # Right panel (unknown)
        self.right_panel = tk.Frame(main_frame, bg="#fff0ef", width=250, height=460, bd=1, relief=tk.SOLID)
        self.right_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(10, 0))
        self.right_panel.pack_propagate(False)
        tk.Label(
            self.right_panel,
            text="不认识（向右拖）",
            bg="#fff0ef",
            fg="#ad2b24",
            font=("PingFang SC", 12, "bold"),
        ).pack(pady=(10, 6))
        self.unknown_listbox = tk.Listbox(self.right_panel, font=("Helvetica", 12))
        self.unknown_listbox.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

    def _show_current_word(self):
        total = len(self.words)
        if self.current_index >= total:
            self.card_area.itemconfig(self.word_text, text="完成！")
            self.progress_label.config(
                text=f"已完成：认识 {len(self.known_words)} 个，不认识 {len(self.unknown_words)} 个"
            )
            return

        word = self.words[self.current_index]
        self.card_area.itemconfig(self.word_text, text=word)
        self.progress_label.config(text=f"进度：{self.current_index + 1} / {total}")
        self._reset_card_position()

    def _reset_card_position(self):
        self.card_area.coords(self.card, 120, 95, 300, 225)
        self.card_area.coords(self.word_text, 210, 160)

    def on_drag_start(self, event):
        self.drag_start_x = event.x
        self.drag_start_y = event.y

    def on_drag_motion(self, event):
        dx = event.x - self.drag_start_x
        dy = event.y - self.drag_start_y
        self.card_area.move(self.card, dx, dy)
        self.card_area.move(self.word_text, dx, dy)
        self.drag_start_x = event.x
        self.drag_start_y = event.y

    def on_drag_release(self, _event):
        if self.current_index >= len(self.words):
            return

        x1, _, x2, _ = self.card_area.coords(self.card)
        card_center_x = (x1 + x2) / 2
        center_x = 210
        threshold = 90

        current_word = self.words[self.current_index]
        if card_center_x < center_x - threshold:
            self.known_words.append(current_word)
            self.known_listbox.insert(tk.END, current_word)
            self.current_index += 1
            self._show_current_word()
        elif card_center_x > center_x + threshold:
            self.unknown_words.append(current_word)
            self.unknown_listbox.insert(tk.END, current_word)
            self.current_index += 1
            self._show_current_word()
        else:
            self._reset_card_position()

    def reset_all(self):
        self.current_index = 0
        self.known_words.clear()
        self.unknown_words.clear()
        self.known_listbox.delete(0, tk.END)
        self.unknown_listbox.delete(0, tk.END)
        self._show_current_word()


if __name__ == "__main__":
    demo_words = [
        "apple",
        "banana",
        "orange",
        "school",
        "window",
        "garden",
        "future",
        "planet",
        "bridge",
        "memory",
    ]

    root = tk.Tk()
    app = WordTrainerApp(root, demo_words)
    root.mainloop()
